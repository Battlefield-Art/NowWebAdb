// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/pages/home/home.vue';
import { getAdbInstance } from '@/utils/adbManager.js';
const MainLayout = () => import('@/layouts/MainLayout.vue');

const routes = [
    {
        // 保留Home页面作为连接页面
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: MainLayout,
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach(to => {
    if (to.name === 'Dashboard' && !getAdbInstance()) return { name: 'Home' };
    if (to.name === 'Home' && getAdbInstance()) return { name: 'Dashboard' };
});

export default router;
