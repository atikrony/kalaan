"""Convert the old Kalaan Excel workbook into erp/data/seed.json.
Usage: python scripts/convert_sheet.py "path/to/kalaan.xlsx"
"""
import sys, re, json, datetime, openpyxl, os

SHEETS = [  # (sheet name, shipment name) oldest first
    ('May shipment Order (1st)', '1st – May'),
    ('EID shipment Order (2nd)', '2nd – EID'),
    ('June Shipment Order (3rd)', '3rd – June'),
    ('July shipment (4TH)', '4th – July'),
    ('August first shipment 5', '5th – August first'),
    ('August last and sep 1st shipmen', '6th – Aug last / Sep 1st'),
    ('SEP 1ST WEEK shipment 7th', '7th – Sep 1st week'),
    ('sep last shipment 8th', '8th – Sep last'),
    ('OCTOBER 1ST SHIPMENT 9TH', '9th – October'),
    ('November Shipment 10th', '10th – November'),
    ('december end (11th)', '11th – December end'),
]
NUM = re.compile(r'\d[\d,]*(?:\.\d+)?')

def tonum(v):
    if isinstance(v, (int, float)): return float(v)
    if isinstance(v, str) and re.fullmatch(r'\s*\d[\d,]*(\.\d+)?\s*(rm|tk)?\s*', v, re.I):
        return float(NUM.search(v).group().replace(',', ''))
    return None

def bill_of(v):
    n = tonum(v)
    if n is not None: return n
    if not isinstance(v, str): return None
    if '=' in v:  # "1690+1190= 2880" -> last number after last '='
        m = NUM.findall(v.split('=')[-1])
        if m: return float(m[0].replace(',', ''))
    expr = v.lower().replace('x', '*').replace(',', '')
    if re.fullmatch(r'[\d\s+*.]+', expr):
        try: return float(eval(expr))
        except Exception: pass
    return None

def text(v):
    if v is None: return ''
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return str(v).strip()

def phone(v):
    if isinstance(v, (int, float)): return '0' + str(int(v))
    return text(v)

def col(h, *keys):
    for i, x in enumerate(h):
        x = (x or '').lower()
        if any(k in x for k in keys): return i
    return None

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ships, orders, pays = [], [], []
now = datetime.datetime.utcnow().isoformat() + 'Z'
for si, (sheet, sname) in enumerate(SHEETS, 1):
    ws = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    h = [text(x) for x in rows[0]]
    c = dict(
        date=col(h, 'date'), src=col(h, 'order from', 'order came'), prod=col(h, 'product'), name=col(h, 'name'),
        addr=col(h, 'address'), mob=col(h, 'mobile'), cat=col(h, 'category'), rm=col(h, 'buying price'),
        bupd=col(h, 'buying update'), adv=col(h, 'advance'), bill=col(h, 'total bill', 'price + delivery'),
        rem=col(h, 'remaining'), dlv=col(h, 'delivery charge'), cod=col(h, 'cod'), dupd=col(h, 'delivery update'),
        ret=col(h, 'return'), note=col(h, 'note'), earn=col(h, 'earned'),
    )
    c['prod'] = col(h, 'product')  # first "product" column (not "product image")
    g = lambda r, k: r[c[k]] if c[k] is not None and c[k] < len(r) else None
    old = si <= 8
    ships.append(dict(id=si, name=sname, status='closed' if old else 'arrived', rate=0, cargo_cost=0, note='Imported from Excel', created_at=now))
    for r in rows[1:]:
        prod, name = text(g(r, 'prod')), text(g(r, 'name'))
        if not prod or not name or tonum(name) is not None or prod.lower() in ('page', 'page '): continue
        adv, bill, rem, earn = tonum(g(r, 'adv')), bill_of(g(r, 'bill')), tonum(g(r, 'rem')), tonum(g(r, 'earn'))
        if bill is None and rem is not None: bill = rem + (adv or 0)
        notes = []
        for k, label in (('bupd', 'Buying'), ('adv', 'Advance'), ('bill', 'Bill'), ('rem', 'Remaining'), ('dupd', 'Delivery'), ('ret', 'Return'), ('note', 'Note'), ('cat', 'Category')):
            v = g(r, k)
            if isinstance(v, str) and v.strip() and tonum(v) is None: notes.append(f'{label}: {v.strip()}')
        alltxt = ' '.join(notes + [text(g(r, 'addr'))]).lower()
        if 'refund' in alltxt: status = 'refunded'
        elif 'cancel' in alltxt or 'no order' in alltxt: status = 'cancelled'
        elif (earn or 0) > 0 or old: status = 'delivered'
        elif (adv or 0) > 0: status = 'confirmed'
        else: status = 'pending'
        d = g(r, 'date')
        oid = len(orders) + 1
        orders.append(dict(
            id=oid, shipment_id=si, order_date=d.date().isoformat() if isinstance(d, datetime.datetime) else None,
            source=text(g(r, 'src')) or 'Page', customer=name.replace('\n', ' ').strip(), phone=phone(g(r, 'mob')),
            address=text(g(r, 'addr')), product=prod, qty=1, images=[], buy_rm=tonum(g(r, 'rm')) or 0,
            bill=bill or 0, delivery_charge=tonum(g(r, 'dlv')) or 0, cod_charge=tonum(g(r, 'cod')) or 0,
            status=status, note=' | '.join(notes) or None, created_at=now))
        if adv: pays.append(dict(id=len(pays) + 1, order_id=oid, amount=adv, kind='advance', method='bKash', paid_on=None, note='Imported'))
        if status == 'delivered' and bill and bill - (adv or 0) > 0:
            pays.append(dict(id=len(pays) + 1, order_id=oid, amount=bill - (adv or 0), kind='payment', method='COD', paid_on=None, note='Imported (assumed paid)'))

out = os.path.join(os.path.dirname(__file__), '..', 'data', 'seed.json')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(dict(shipments=ships, orders=orders, payments=pays), open(out, 'w', encoding='utf8'), ensure_ascii=False)
from collections import Counter
print(len(ships), 'shipments,', len(orders), 'orders,', len(pays), 'payments')
print(Counter(o['shipment_id'] for o in orders)); print(Counter(o['status'] for o in orders))
print('orders with bill 0:', sum(1 for o in orders if not o['bill']))
