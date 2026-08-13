const Layout = () => import("@/layout/index.vue");

export default {
  path: "/menghuan",
  name: "Menghuan",
  component: Layout,
  redirect: "/menghuan/consume",
  meta: {
    icon: "ri/coin-line",
    title: "购买角色统计",
    rank: 3
  },
  children: [
    {
      path: "/menghuan/consume",
      name: "MenghuanConsume",
      component: () => import("@/views/menghuan/consume/index.vue"),
      meta: {
        title: "购买角色统计"
      }
    }
  ]
} satisfies RouteConfigsTable;
