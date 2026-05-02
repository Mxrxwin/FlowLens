// Client-side device/browser metadata. Region is resolved server-side.

export interface DeviceMeta {
  user_agent: string;
}

export function getDeviceMeta(): DeviceMeta {
  return { user_agent: navigator.userAgent };
}
