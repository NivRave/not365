import * as api from './api'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser')
    return false
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const vapidKey = 'BFG1cZWndXsctNDvaHOKJcBwIhWirsFinYYSBphJdbArBtO-pgbRWQDbwkOH80Mdg8kpF7N76LWL8AdFDGy7hkg'
    const convertedVapidKey = urlBase64ToUint8Array(vapidKey)

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })
    }

    await api.registerPushSubscription(subscription)
    return true
  } catch (err) {
    console.error('Failed to subscribe for push notifications:', err)
    return false
  }
}
