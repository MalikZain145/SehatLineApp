export let completedOrders: any[] = [];

export const addCompletedOrder = (patient: any) => {
  completedOrders.push(patient);
};