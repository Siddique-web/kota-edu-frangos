/** Centro de Beira. A entrega só aceita um ponto dentro deste raio. */
export const BEIRA = { lat: -19.8436, lng: 34.8389 };
export const DELIVERY_RADIUS_KM = 30;
/** Acima disto o GPS não chega para o estafeta parar na porta certa. */
export const PIN_MAX_ACCURACY_M = 80;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** null quando o ponto serve para entregar. Caso contrário, a frase para o cliente. */
export function validateDeliveryPin(lat: number | null, lng: number | null, accuracy: number | null): string | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Marque a sua localização para o estafeta saber onde entregar.';
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Localização inválida. Marque outra vez.';
  if (haversineKm(lat, lng, BEIRA.lat, BEIRA.lng) > DELIVERY_RADIUS_KM) {
    return 'Esta localização está fora da zona de entrega de Beira.';
  }
  if (accuracy != null && (!Number.isFinite(accuracy) || accuracy > PIN_MAX_ACCURACY_M)) {
    const metres = Number.isFinite(accuracy) ? `${Math.round(accuracy)} m` : 'demasiado fraca';
    return `O GPS está impreciso (${metres}). Saia para um sítio aberto e marque outra vez.`;
  }
  return null;
}

/** Navegação de carro até ao ponto exacto marcado pelo cliente. */
export function mapsDirectionsUrl(lat: number, lng: number): string {
  const dest = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

/** O ponto em si, para o cliente confirmar que caiu na porta certa. */
export function mapsPinUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function orderMapsUrl(o: { lat?: number; lng?: number; address?: string; zoneName?: string }): string | null {
  if (o.lat != null && o.lng != null && Number.isFinite(o.lat) && Number.isFinite(o.lng)) return mapsDirectionsUrl(o.lat, o.lng);
  const place = [o.address, o.zoneName].filter(Boolean).join(', ');
  if (!place) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Beira, Moçambique`)}`;
}
