import { all, get, orderView, byIdDesc } from '@/lib/store';
import OrderForm from '@/components/OrderForm';
export const dynamic = 'force-dynamic';
export default async function NewOrder({ searchParams }) {
  const sp = await searchParams;
  const ships = (await all('shipments')).sort(byIdDesc);
  const def = +sp.shipment || ships.find((s) => s.status === 'collecting')?.id;
  return (<><h1>New order</h1><OrderForm shipments={ships} defShipment={def} /></>);
}
