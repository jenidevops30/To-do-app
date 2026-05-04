import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuth } from '../composables/useAuth';

// Pages
import LoginPage from '../pages/LoginPage.vue';
import SignupPage from '../pages/SignupPage.vue';
import TodoList from '../components/TodoList.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const { isAuthenticated } = useAuth();
      return isAuthenticated.value ? '/todos' : '/login';
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: {
      requiresAuth: false,
      title: 'Login - Todo App',
    },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: SignupPage,
    meta: {
      requiresAuth: false,
      title: 'Sign Up - Todo App',
    },
  },
  {
    path: '/todos',
    name: 'Todos',
    component: TodoList,
    meta: {
      requiresAuth: true,
      title: 'My Todos - Todo App',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/todos',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Navigation guard to check authentication
router.beforeEach((to, _from, next) => {
  const { isAuthenticated } = useAuth();

  // Update page title
  const title = to.meta.title as string | undefined;
  if (title) {
    document.title = title;
  }

  // Check if route requires authentication
  const requiresAuth = to.meta.requiresAuth as boolean | undefined;

  if (requiresAuth && !isAuthenticated.value) {
    // Redirect to login if trying to access protected route
    next('/login');
  } else if (!requiresAuth && isAuthenticated.value && (to.path === '/login' || to.path === '/signup')) {
    // Redirect to todos if already authenticated and trying to access login/signup
    next('/todos');
  } else {
    next();
  }
});

export default router;
