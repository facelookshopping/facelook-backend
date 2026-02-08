export enum OrderStatus {
    PENDING = 'Pending',           // Created, Payment Pending
    PLACED = 'Placed',             // Payment Success / COD Confirmed
    ACCEPTED = 'Accepted',         // Admin acknowledged
    SHIPPED = 'Shipped',           // Handed to courier
    OUT_FOR_DELIVERY = 'OutForDelivery', // Last mile
    DELIVERED = 'Delivered',       // Done
    CANCELLED = 'Cancelled',
}

export enum PaymentType {
    ONLINE = 'ONLINE',
    COD = 'COD',
}