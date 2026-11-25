import { getUser } from '@/lib/session';
import { all, orderView, byIdDesc } from '@/lib/store';
import PasswordForm from '@/components/PasswordForm';
import DataAdmin from '@/components/DataAdmin';
export const dynamic = 'force-dynamic';

export default async function Settings() {
  const u = await getUser();
  const isSysad = u?.username === 'sysad';
  let data = null;
  if (isSysad) {
    const [orders, ships, pays, buys] = await Promise.all([orderView(), all('shipments'), all('payments'), all('purchases')]);
    const sn = Object.fromEntries(ships.map((s) => [s.id, s.name]));
    const oc = {};
    for (const o of orders) if (o.shipment_id) oc[o.shipment_id] = (oc[o.shipment_id] || 0) + 1;
    data = {
      shipments: ships.sort(byIdDesc).map((s) => ({ ...s, order_count: oc[s.id] || 0 })),
      orders,
      payments: pays.sort(byIdDesc),
      purchases: buys.sort(byIdDesc).map((p) => ({ ...p, shipment_name: sn[p.shipment_id] })),
    };
  }
  return (
    <div className="center-wrap">
      <div className="page-head"><div><h1>Settings</h1><p>Change the password you use to sign in.</p></div></div>
      <PasswordForm />
      {isSysad && <DataAdmin data={data} />}
    </div>
  );
}
