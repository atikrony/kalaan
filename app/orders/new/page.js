import { db } from '@/lib/db';
import OrderForm from '@/components/OrderForm';
export const dynamic = 'force-dynamic';
export default async function NewOrder({ searchParams }) {
  const sp = await searchParams;
  const { data: ships = [] } = await db().from('shipments').select('id,name,status').order('id', { ascending: false });
  const def = sp.shipment || ships.find((s) => s.status === 'collecting')?.id;
  return (<><h1>New order</h1><OrderForm shipments={ships} defShipment={def} /></>);
}
