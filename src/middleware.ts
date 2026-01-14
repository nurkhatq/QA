export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/admin/:path*',
    '/analyst/:path*',
    '/company/:path*',
  ],
};
