import { EventEmitter } from "node:events";

export type NotificationEvent = {
  tenantId: string;
  userId: string;
  notificationId: string;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const EVENT_NAME = "notification.created";

export function publishNotificationCreated(event: NotificationEvent) {
  emitter.emit(EVENT_NAME, event);
}

export function subscribeNotificationCreated(listener: (event: NotificationEvent) => void) {
  emitter.on(EVENT_NAME, listener);
  return () => {
    emitter.off(EVENT_NAME, listener);
  };
}
