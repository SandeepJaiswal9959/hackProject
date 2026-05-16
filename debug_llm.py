import httpx, asyncio, json, re

with open('public/series_cache.json') as f:
    cache = json.load(f)
series = cache['121500']

MONTH_MAP = {1:'May',2:'Apr',3:'Mar',4:'Feb',5:'Jan',6:'Dec',
             7:'Nov',8:'Oct',9:'Sep',10:'Aug',11:'Jul',12:'Jun'}
FIELDS = [
    ('bl_cons','BL Consumed'),('bl_active_days','BL Active Days'),
    ('bl_credit_lapsed','BL Credits Lapsed'),('current_balance','Credit Balance'),
    ('total_enq','Enquiries'),('replies','Replies'),('lms_active_days','Platform Logins'),
    ('cqs','CQS'),('prd_added','Prd Added'),
]
header = '| Month | ' + ' | '.join(f[1] for f in FIELDS) + ' |'
sep    = '|---|' + '|'.join(['---']*len(FIELDS)) + '|'
rows   = []
for rec in series[:7]:
    mn = rec.get('month_number', 0)
    label = MONTH_MAP.get(mn, f'M{mn}')
    vals = ' | '.join(str(rec.get(f[0]) or 0) for f in FIELDS)
    rows.append(f'| {label} | {vals} |')
table = '\n'.join([header, sep] + rows)

prompt = (
    "Churn analyst task. Supplier: Dextero (GLID:121500), renewal in 60d.\n\n"
    + table + "\n\n"
    "BL Consumed=leads used, BL Credits Lapsed=unused credits, Platform Logins=days logged in, "
    "CQS=catalog quality 0-100. Compare months 1-2 vs months 4-6 to find decline %.\n\n"
    'Output ONLY this JSON (no markdown, no extra text, keep values SHORT):\n'
    '{"s":SCORE,"l":"LEVEL","t":"TREND","r":["REASON1","REASON2","REASON3"],'
    '"a":"ACTION","ss":"SUMMARY 2 sentences","rc":"ROOT CAUSE 2 sentences",'
    '"p":["STEP1","STEP2","STEP3"],'
    '"m":{"b":BL_DECLINE_PCT,"lg":LMS_DECLINE_PCT,"e":ENQ_DECLINE_PCT,"rp":REPLY_DECLINE_PCT}}\n'
    "LEVEL=Critical(75-100)/High(55-74)/Medium(30-54)/Low(0-29). Use real numbers."
)

async def test():
    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            'https://imllm.intermesh.net/v1/chat/completions',
            headers={
                'Authorization': 'Bearer sk-Bbwms0AvP-Zk43rMVqKPhw',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'gpt-4o-mini',
                'messages': [
                    {'role': 'system', 'content': 'JSON API. Return only valid compact JSON. No markdown. No prose.'},
                    {'role': 'user', 'content': prompt}
                ],
                'max_tokens': 500,
                'temperature': 0.1
            }
        )
        content = resp.json()['choices'][0]['message']['content'].strip()
        print(f'Length: {len(content)}')
        print('RAW:', content)
        print()

        clean = re.sub(r'^```(?:json)?\s*', '', content)
        clean = re.sub(r'\s*```\s*$', '', clean).strip()

        m = re.search(r'\{[\s\S]*\}', clean)
        print('JSON found:', bool(m))
        if m:
            parsed = json.loads(m.group())
            print(json.dumps(parsed, indent=2))

asyncio.run(test())
