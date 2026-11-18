export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/admin' || to.path.startsWith('/admin/')) {
    return navigateTo('/', { replace: true })
  }
})
