"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRegistrationPrice = calculateRegistrationPrice;
exports.formatPrice = formatPrice;
exports.getVehicleTypeDescription = getVehicleTypeDescription;
function calculateRegistrationPrice(typeVehicule) {
    const pricingMap = {
        BUS: 60000,
        MINI_BUS: 60000,
        TAXI: 50000
    };
    return pricingMap[typeVehicule];
}
function formatPrice(price) {
    return `${price.toLocaleString('fr-FR')} FC`;
}
function getVehicleTypeDescription(typeVehicule) {
    const descriptions = {
        BUS: 'Bus',
        MINI_BUS: 'Mini Bus',
        TAXI: 'Taxi'
    };
    return descriptions[typeVehicule];
}
