import type { Basket } from '@/interfaces/Basket';
import type { ClientOffer, Offer, PrestataireOffer } from '@/interfaces/Offer';
import type { Order, OrderItem } from '@/interfaces/Order';
import type { Request, RequestItem, RequestSummary } from '@/interfaces/Request';
import { mockOrders } from './mockOrders';
import { mockPartnerOrders, mockPrestataireIncomingRequests, mockPrestataireOffers } from './mockPrestataire';
import { mockBasket, mockProducts } from './mockProducts';
import { mockOffers, mockRequests } from './mockRequests';
import type { PlaceOrderPayload } from '../resources/orders';
import type { ShipOfferPayload, SubmitOfferPayload } from '../resources/prestataire';
import type { CreateRequestPayload } from '../resources/requests';
import type { ApiResponse, Paginated } from '../types';

export interface MockShipment {
  offerId: number;
  trackingNumber: string;
  carrier: string | null;
  notes: string | null;
  shippedAt: string;
}

type Envelope = ApiResponse<unknown> | Paginated<unknown>;
type State = { requests: Request[]; offers: Offer[]; basket: Basket; orders: Order[]; shipments: MockShipment[] };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const now = () => new Date().toISOString();
const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map(({ id }) => id)) + 1;
const roundMoney = (value: number) => Math.round(value * 100) / 100;
const one = <T>(data: T): ApiResponse<T> => ({ success: true, data });
const page = <T>(data: T[]): Paginated<T> => ({
  success: true, data,
  pagination: { total: data.length, perPage: data.length, currentPage: 1, lastPage: 1, from: data.length ? 1 : 0, to: data.length },
});
const seed = (): State => {
  const offers = new Map([...clone(mockOffers), ...clone(mockPrestataireOffers)].map((row) => [row.id, row]));
  const orders = new Map([...clone(mockOrders), ...clone(mockPartnerOrders)].map((row) => [row.id, row]));
  return {
    requests: [...clone(mockRequests), ...clone(mockPrestataireIncomingRequests)],
    offers: [...offers.values()],
    basket: clone(mockBasket),
    orders: [...orders.values()],
    shipments: [],
  };
};
let state = seed();
export const resetMockStore = () => { state = seed(); };
export const getMockState = (): Readonly<State> => state;
const requestById = (id: number) => {
  const row = state.requests.find((item) => item.id === id);
  if (!row) throw new Error('Request ' + id + ' not found');
  return row;
};
const offerById = (id: number) => {
  const row = state.offers.find((item) => item.id === id);
  if (!row) throw new Error('Offer ' + id + ' not found');
  return row;
};
const summary = (row: Request): RequestSummary => ({
  id: row.id, reference: row.reference, status: row.status,
  expiresDisplay: row.expiresAt ? '2h 00min' : null, createdAt: row.createdAt,
});
const toClientOffer = (offer: Offer): ClientOffer => {
  const client = { ...offer } as Partial<Offer>;
  delete client.priceFerrailleur;
  delete client.priceBc;
  return client as ClientOffer;
};
const toPrestataireOffer = (offer: Offer): PrestataireOffer => {
  const partner = { ...offer } as Partial<Offer>;
  delete partner.ferrailleurId;
  delete partner.priceClient;
  delete partner.priceBc;
  delete partner.validatedBy;
  const requestItem = state.requests
    .find(({ id }) => id === offer.requestId)
    ?.items?.find(({ id }) => id === offer.requestItemId);
  return {
    ...partner,
    condition: requestItem?.condition ?? 'en_stock',
    quantity: requestItem?.quantity ?? 1,
    images: offer.images ?? [],
    categoryTitle: requestItem?.categoryTitle ?? null,
    categoryTitleAr: requestItem?.categoryTitleAr ?? null,
    categoryImage: requestItem?.categoryImage ?? null,
    ferrailleurName: null,
    shippingEligible: offer.status === 'selected' && !state.shipments.some(({ offerId }) => offerId === offer.id),
  } as PrestataireOffer;
};

function createRequest(payload: CreateRequestPayload) {
  if (
    !Number.isInteger(payload.vehicleId) || payload.vehicleId <= 0 ||
    !payload.items.length ||
    payload.items.some(({ categoryId, quantity }) =>
      !Number.isInteger(categoryId) || categoryId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0
    )
  ) throw new Error('Invalid request payload');
  const id = nextId(state.requests);
  const timestamp = now();
  let itemId = nextId(state.requests.flatMap((row) => row.items ?? []));
  const items: RequestItem[] = payload.items.map((item) => ({
    id: itemId++, requestId: id, categoryId: item.categoryId, quantity: item.quantity,
    condition: item.condition, notes: item.notes ?? null, createdAt: timestamp, updatedAt: timestamp,
    categoryTitle: item.categoryTitle, categoryTitleAr: item.categoryTitleAr,
  }));
  const row: Request = {
    id, reference: String(100000000 + id), userId: 1, vehicleId: payload.vehicleId, addressId: null,
    notes: payload.notes ?? null, status: 'draft', aiValidationTag: null, aiValidationReason: null,
    offersCount: 0, expiresAt: null, createdAt: timestamp, updatedAt: timestamp,
    items, images: payload.images ?? [],
  };
  state.requests.unshift(row);
  return one({ id, reference: row.reference });
}
function sendRequest(id: number) {
  const row = requestById(id);
  if (row.status !== 'draft' && row.status !== 'pending') throw new Error('Request cannot be sent');
  row.status = 'pending'; row.expiresAt ??= new Date(Date.now() + 7200000).toISOString(); row.updatedAt = now();
  return one({ id, reference: row.reference, status: 'pending' as const });
}
function submitOffer(requestId: number, payload: SubmitOfferPayload) {
  const request = requestById(requestId);
  if (!['pending', 'offers_received'].includes(request.status)) throw new Error('Request is not open');
  const itemIds = new Set((request.items ?? []).map(({ id }) => id));
  const submittedIds = payload.lines.map(({ requestItemId }) => requestItemId);
  const pricedLines = payload.lines.map((line) => {
    const priceFerrailleur = roundMoney(line.priceFerrailleur);
    return {
      line,
      priceFerrailleur,
      priceClient: roundMoney(priceFerrailleur * 1.06),
      priceBc: roundMoney(priceFerrailleur * 0.94),
    };
  });
  if (
    !payload.lines.length ||
    new Set(submittedIds).size !== submittedIds.length ||
    payload.lines.some(({ requestItemId }) => !itemIds.has(requestItemId)) ||
    pricedLines.some(({ priceFerrailleur, priceClient, priceBc }) =>
      [priceFerrailleur, priceClient, priceBc].some((price) => !Number.isFinite(price) || price <= 0)
    )
  ) {
    throw new Error('Invalid offer lines');
  }
  let id = nextId(state.offers);
  const firstId = id;
  const timestamp = now();
  pricedLines.forEach(({ line, priceFerrailleur, priceClient, priceBc }) => {
    state.offers.unshift({
      id, reference: String(10000 + id), requestId, ferrailleurId: 10, requestItemId: line.requestItemId,
      priceFerrailleur, priceClient, priceBc,
      description: line.description, audioUrl: null, availability: 'available', status: 'validated',
      adminNotes: null, validatedBy: 1, validatedAt: timestamp, createdAt: timestamp, updatedAt: timestamp, images: line.images,
    });
    id += 1;
  });
  request.offersCount = state.offers.filter((offer) => offer.requestId === requestId).length;
  request.status = 'offers_received'; request.updatedAt = timestamp;
  return one({ success: true, offerId: firstId });
}
function acceptOffer(offerId: number) {
  const offer = offerById(offerId);
  if (!['validated', 'selected'].includes(offer.status)) throw new Error('Offer cannot be selected');
  const request = requestById(offer.requestId);
  const requestItem = request.items?.find(({ id }) => id === offer.requestItemId);
  if (!requestItem) throw new Error('Request item not found');
  offer.status = 'selected'; offer.updatedAt = now();
  if (state.basket.requestId !== request.id) {
    state.basket = { ...state.basket, requestId: request.id, items: [], updatedAt: now() };
  }
  state.basket.items ??= [];
  const competingOffers = state.offers.filter((candidate) =>
    candidate.id !== offer.id &&
    candidate.requestId === offer.requestId &&
    candidate.requestItemId === offer.requestItemId &&
    candidate.status === 'selected'
  );
  const competingIds = new Set(competingOffers.map(({ id }) => id));
  competingOffers.forEach((candidate) => {
    candidate.status = 'validated';
    candidate.updatedAt = now();
  });
  state.basket.items = state.basket.items.filter((item) => !competingIds.has(item.offerId));
  if (!state.basket.items.some((item) => item.offerId === offer.id)) {
    state.basket.items.push({
      id: nextId(state.basket.items), basketId: state.basket.id, offerId: offer.id, categoryId: requestItem.categoryId,
      quantity: requestItem.quantity, unitPrice: offer.priceClient, createdAt: now(), updatedAt: now(),
      categoryTitle: requestItem.categoryTitle, categoryTitleAr: requestItem.categoryTitleAr, categoryImage: requestItem.categoryImage,
    });
  }
  state.basket.updatedAt = now();
  return one(clone(state.basket));
}
function addProduct(productId: number, quantity: number) {
  const product = mockProducts.find(({ id }) => id === productId);
  if (!product) throw new Error('Product ' + productId + ' not found');
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Invalid quantity');
  state.basket.items ??= [];
  const existing = state.basket.items.find((item) => item.offerId === productId);
  if (existing) { existing.quantity += quantity; existing.updatedAt = now(); }
  else state.basket.items.push({
    id: nextId(state.basket.items), basketId: state.basket.id, offerId: productId, categoryId: product.categoryId,
    quantity, unitPrice: product.promoPrice ?? product.price, createdAt: now(), updatedAt: now(),
    categoryTitle: product.categoryName, categoryTitleAr: product.categoryNameAr, categoryImage: product.images[0] ?? null,
  });
  state.basket.updatedAt = now();
  return one(clone(state.basket));
}
function changeBasketItem(itemId: number, quantity: number) {
  const items = state.basket.items ?? [];
  if (!items.some(({ id }) => id === itemId)) throw new Error('Basket item not found');
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Invalid quantity');
  state.basket.items = quantity === 0 ? items.filter(({ id }) => id !== itemId) :
    items.map((item) => item.id === itemId ? { ...item, quantity, updatedAt: now() } : item);
  state.basket.updatedAt = now();
  return one(clone(state.basket));
}
function placeOrder(payload: PlaceOrderPayload) {
  const basketItems = state.basket.items ?? [];
  if (!basketItems.length) throw new Error('Basket is empty');
  const timestamp = now();
  const id = nextId(state.orders);
  const items: OrderItem[] = basketItems.map((item, index) => ({
    id: id * 1000 + index + 1, orderId: id, offerId: item.offerId, categoryId: item.categoryId,
    quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.unitPrice * item.quantity,
    status: 'confirmed', createdAt: timestamp, updatedAt: timestamp,
    categoryTitle: item.categoryTitle, categoryTitleAr: item.categoryTitleAr,
  }));
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.totalPrice, 0));
  const taxAmount = roundMoney(subtotal * 0.2);
  const order: Order = {
    id, reference: 'ORD-' + String(id).padStart(6, '0'), userId: 1, addressId: payload.addressId, couponId: null,
    subtotal, discountAmount: 0, shippingFee: 0, taxAmount, total: subtotal + taxAmount, status: 'confirmed',
    paymentMethod: payload.paymentMethod, paymentStatus: 'pending', notes: payload.notes ?? null,
    confirmedBy: null, confirmedAt: timestamp, createdAt: timestamp, updatedAt: timestamp, items,
  };
  state.orders.unshift(order);
  if (state.basket.requestId !== null) {
    const request = requestById(state.basket.requestId); request.status = 'ordered'; request.updatedAt = timestamp;
  }
  state.basket = { ...state.basket, requestId: null, items: [], updatedAt: timestamp };
  return one(clone(order));
}
function shipOffer(offerId: number, payload: ShipOfferPayload) {
  const offer = offerById(offerId);
  if (offer.status !== 'selected') throw new Error('Offer is not accepted');
  if (state.shipments.some((row) => row.offerId === offerId)) return one({ offerId, shipped: true });
  const order = state.orders.find((row) => row.items?.some((item) => item.offerId === offerId));
  const orderItem = order?.items?.find((item) => item.offerId === offerId);
  if (!order || !orderItem || order.status !== 'confirmed' || orderItem.status !== 'confirmed') {
    throw new Error('Confirmed order item not found');
  }
  const shippedAt = now();
  state.shipments.push({ offerId, trackingNumber: payload.trackingNumber, carrier: payload.carrier ?? null, notes: payload.notes ?? null, shippedAt });
  offer.updatedAt = shippedAt;
  order.items = order.items?.map((item) =>
    item.offerId === offerId ? { ...item, status: 'shipped', updatedAt: shippedAt } : item
  );
  if (order.items?.every((item) => item.status === 'shipped')) order.status = 'shipped';
  order.updatedAt = shippedAt;
  return one({ offerId, shipped: true });
}

export function handleGoldenRequest(method: string, path: string, body?: unknown): Envelope | undefined {
  if (method === 'GET' && path === '/requests') return page(state.requests.map(summary));
  if (method === 'POST' && path === '/requests') return createRequest(body as CreateRequestPayload);
  if (method === 'GET' && path === '/basket') return one(clone(state.basket));
  if (method === 'POST' && path === '/basket/items') {
    const value = body as { productId: number; quantity: number }; return addProduct(value.productId, value.quantity);
  }
  if (method === 'POST' && path === '/orders') return placeOrder(body as PlaceOrderPayload);
  if (method === 'GET' && path === '/orders') return page(clone(state.orders));
  if (method === 'GET' && path === '/prestataire/incoming-requests') return page(clone(state.requests.filter(({ status }) => status === 'pending')));
  if (method === 'GET' && (path === '/prestataire/offers' || path.includes('/prestataire/offers?'))) {
    const status = new URLSearchParams(path.split('?')[1] ?? '').get('status');
    return page(clone(state.offers.filter((offer) => {
      const shipped = state.shipments.some(({ offerId }) => offerId === offer.id);
      return status === 'active' ? offer.status === 'validated' : status === 'accepted' ? offer.status === 'selected' && !shipped :
        status === 'sent' ? offer.status === 'pending' : status === 'shipped' ? shipped : true;
    }).map(toPrestataireOffer)));
  }
  if (method === 'GET' && (path === '/prestataire/orders' || path.includes('/prestataire/orders?'))) {
    const status = new URLSearchParams(path.split('?')[1] ?? '').get('status');
    return page(clone(state.orders.filter((order) => !status || (status === 'accepted' ? order.status === 'confirmed' : order.status === status))));
  }
  let match = path.match(/^\/requests\/(\d+)$/);
  if (method === 'GET' && match) return one(clone(requestById(Number(match[1]))));
  match = path.match(/^\/requests\/(\d+)\/send$/);
  if (method === 'POST' && match) return sendRequest(Number(match[1]));
  match = path.match(/^\/requests\/(\d+)\/offers$/);
  if (method === 'GET' && match) {
    const id = Number(match[1]);
    requestById(id);
    return page(state.offers
      .filter((row) => row.requestId === id && ['validated', 'selected'].includes(row.status))
      .map(toClientOffer));
  }
  match = path.match(/^\/offers\/(\d+)$/);
  if (method === 'GET' && match) {
    const offer = offerById(Number(match[1]));
    if (!['validated', 'selected'].includes(offer.status)) throw new Error('Offer not found');
    return one(toClientOffer(offer));
  }
  match = path.match(/^\/offers\/(\d+)\/accept$/);
  if (method === 'POST' && match) return acceptOffer(Number(match[1]));
  match = path.match(/^\/basket\/items\/(\d+)$/);
  if (method === 'PUT' && match) return changeBasketItem(Number(match[1]), (body as { quantity: number }).quantity);
  if (method === 'DELETE' && match) return changeBasketItem(Number(match[1]), 0);
  match = path.match(/^\/orders\/(\d+)$/);
  if (method === 'GET' && match) { const orderId = Number(match[1]); const row = state.orders.find(({ id }) => id === orderId); if (!row) throw new Error('Order not found'); return one(clone(row)); }
  match = path.match(/^\/prestataire\/requests\/(\d+)\/offers$/);
  if (method === 'POST' && match) return submitOffer(Number(match[1]), body as SubmitOfferPayload);
  match = path.match(/^\/prestataire\/offers\/(\d+)\/shipment$/);
  if (method === 'GET' && match) { const id = Number(match[1]); offerById(id); return one(clone(state.shipments.find((row) => row.offerId === id) ?? null)); }
  match = path.match(/^\/prestataire\/offers\/(\d+)\/ship$/);
  if (method === 'POST' && match) return shipOffer(Number(match[1]), body as ShipOfferPayload);
  match = path.match(/^\/prestataire\/offers\/(\d+)$/);
  if (method === 'GET' && match) return one(clone(toPrestataireOffer(offerById(Number(match[1])))));
  match = path.match(/^\/prestataire\/orders\/(\d+)$/);
  if (method === 'GET' && match) { const orderId = Number(match[1]); const row = state.orders.find(({ id }) => id === orderId); if (!row) throw new Error('Order not found'); return one(clone(row)); }
  return undefined;
}
