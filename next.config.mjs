export default {
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  images: { unoptimized: true },
  // Old URLs from the previous UI keep working
  async redirects() {
    return [
      { source: '/orders/new', destination: '/', permanent: false },
      { source: '/orders/:id', destination: '/?o=:id', permanent: false },
      { source: '/orders', destination: '/', permanent: false },
      { source: '/shipments/:id', destination: '/?s=:id', permanent: false },
      { source: '/shipments', destination: '/reconciliation', permanent: false },
    ];
  },
};
