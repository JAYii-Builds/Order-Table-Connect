import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListOrdersQueryKey,
  getListReservationsQueryKey,
  getGetStaffDashboardQueryKey,
  getGetKitchenDashboardQueryKey,
  getGetManagerDashboardQueryKey,
} from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/api-config";

export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const url = `${getApiBaseUrl()}/api/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    function invalidateOrders() {
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetKitchenDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetManagerDashboardQueryKey() });
    }

    function invalidateReservations() {
      queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStaffDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetManagerDashboardQueryKey() });
    }

    es.addEventListener("order:created", invalidateOrders);
    es.addEventListener("order:updated", invalidateOrders);
    es.addEventListener("reservation:created", invalidateReservations);
    es.addEventListener("reservation:updated", invalidateReservations);

    es.onerror = () => {};

    return () => {
      es.close();
    };
  }, [queryClient]);
}
