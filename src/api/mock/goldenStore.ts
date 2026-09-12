import type { Basket } from '@/interfaces/Basket';
import type { ClientOfferItem, Offer, PrestataireOffer } from '@/interfaces/Offer';
import type { Order, OrderItem, PrestataireOrder, PrestatairePurchaseOrder, PurchaseOrderStatus } from '@/interfaces/Order';
import type { Request, RequestItem, RequestSummary } from '@/interfaces/Request';
import type { PrestataireWallet, Withdrawal } from '@/interfaces/Wallet';
import type { Address } from '@/interfaces/Address';
import type { Vehicle } from '@/interfaces/Vehicle';
import type { Review } from '@/interfaces/Review';
import type { Pneumatic } from '@/interfaces/Pneumatic';
import { mockOrders } from './mockOrders';
import { mockPartnerOrders, mockPrestataireIncomingRequests, mockPrestataireOffers, mockPrestataireWallet, mockWithdrawals } from './mockPrestataire';
import { mockBasket, mockProducts, mockReviews } from './mockProducts';
import { mockVehicles, mockCarBrands, mockCarModels, mockCarMotorizations } from './mockVehicles';
import { mockAddresses } from './mockOrders';
import { mockPneumatics } from './mockPneumatics';
import { mockCategories, mockPartBrands } from './mockCategories';
import { mockOffers, mockRequests } from './mockRequests';
import { categoryImageFor } from './categoryImage';
import type { PlaceOrderPayload } from '../resources/orders';
import type { ConfirmWithdrawalPayload, RequestWithdrawalPayload, ShipOfferPayload, SubmitOfferPayload } from '../resources/prestataire';
import type { CreateRequestPayload } from '../resources/requests';
import type { AddAddressPayload, UpdateAddressPayload } from '../resources/addresses';
import type { AddVehiclePayload } from '../resources/vehicles';
import { DEFAULT_PAGE_SIZE } from '../config';
import type { ApiResponse, Paginated } from '../types';

export interface MockShipment {
  offerId: number;
  trackingNumber: string;
  carrier: string | null;
  notes: string | null;
  shippedAt: string;
}

type Envelope = ApiResponse<unknown> | Paginated<unknown>;
type State = { requests: Request[]; offers: Offer[]; basket: Basket; orders: Order[]; partnerOrders: PrestataireOrder[]; shipments: MockShipment[]; wallet: PrestataireWallet; withdrawals: Withdrawal[]; addresses: Address[]; vehicles: Vehicle[]; reviews: Review[] };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const now = () => new Date().toISOString();
const nextId = (rows: { id: number }[]) => Math.max(0, ...rows.map(({ id }) => id)) + 1;
const roundMoney = (value: number) => Math.round(value * 100) / 100;
const priceBasket = (basket: Basket): Basket => {
  const subtotal = roundMoney((basket.items ?? []).reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  ));
  const taxable = Math.max(0, roundMoney(subtotal - basket.discountAmount + basket.shippingFee));
  basket.subtotal = subtotal;
  basket.taxAmount = roundMoney(taxable - taxable / 1.2);   // embedded VAT, informational
  basket.total = taxable;                                    // subtotal − discount + shipping, all TTC
  return basket;
};
const one = <T>(data: T): ApiResponse<T> => ({ success: true, data });
const page = <T>(data: T[]): Paginated<T> => ({
  success: true, data,
  pagination: { total: data.length, perPage: data.length, currentPage: 1, lastPage: 1, from: data.length ? 1 : 0, to: data.length },
});
const seed = (): State => {
  const offers = new Map([...clone(mockOffers), ...clone(mockPrestataireOffers)].map((row) => [row.id, row]));
  const orders = new Map(clone(mockOrders).map((row) => [row.id, row]));
  const requests = [...clone(mockRequests), ...clone(mockPrestataireIncomingRequests)].map((request) => ({
    ...request,
    expiresAt: ['pending', 'offers_received'].includes(request.status)
      ? new Date(Date.now() + 7200000).toISOString()
      : request.expiresAt,
    items: request.items?.map((item) => ({
      ...item,
      categoryImage: item.categoryImage ?? categoryImageFor(item.categoryId),
    })),
  }));
  return {
    requests,
    offers: [...offers.values()],
    basket: priceBasket(clone(mockBasket)),
    orders: [...orders.values()],
    partnerOrders: clone(mockPartnerOrders),
    shipments: [],
    wallet: clone(mockPrestataireWallet),
    withdrawals: clone(mockWithdrawals),
    addresses: clone(mockAddresses),
    vehicles: clone(mockVehicles),
    reviews: clone(mockReviews),
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
const toClientOffer = (offer: Offer): ClientOfferItem => {
  const client = { ...offer } as Partial<Offer>;
  delete client.priceFerrailleur;
  delete client.priceBc;
  const requestItem = state.requests
    .find(({ id }) => id === offer.requestId)
    ?.items?.find(({ id }) => id === offer.requestItemId);
  return {
    ...client,
    categoryTitle: requestItem?.categoryTitle,
    categoryTitleAr: requestItem?.categoryTitleAr,
    categoryImage: requestItem?.categoryImage ?? null,
    brandName: requestItem?.brandName ?? null,
    brandNameAr: requestItem?.brandNameAr ?? null,
  } as ClientOfferItem;
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
    brandName: requestItem?.brandName ?? null,
    brandNameAr: requestItem?.brandNameAr ?? null,
    shippingEligible: offer.status === 'selected' && !state.shipments.some(({ offerId }) => offerId === offer.id),
  } as PrestataireOffer;
};

function createRequest(payload: CreateRequestPayload) {
  const pairKey = (categoryId: number, brandId: number | null | undefined) => `${categoryId}:${brandId ?? 'none'}`;
  if (
    !Number.isInteger(payload.vehicleId) || payload.vehicleId <= 0 ||
    !payload.items.length ||
    payload.items.some(({ categoryId, quantity, brandId }) =>
      !Number.isInteger(categoryId) || categoryId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0 ||
      (brandId != null && (!Number.isInteger(brandId) || brandId <= 0))
    ) ||
    new Set(payload.items.map((item) => pairKey(item.categoryId, item.brandId))).size !== payload.items.length
  ) throw new Error('Invalid request payload');
  const id = nextId(state.requests);
  const timestamp = now();
  let itemId = nextId(state.requests.flatMap((row) => row.items ?? []));
  const items: RequestItem[] = payload.items.map((item) => {
    const category = mockCategories.find(({ id: categoryId }) => categoryId === item.categoryId);
    const brand = item.brandId != null ? mockPartBrands.find(({ id: brandId }) => brandId === item.brandId) : undefined;
    return {
      id: itemId++, requestId: id, categoryId: item.categoryId, quantity: item.quantity,
      condition: item.condition, notes: item.notes ?? null, createdAt: timestamp, updatedAt: timestamp,
      categoryTitle: category?.title ?? item.categoryTitle,
      categoryTitleAr: category?.titleAr ?? item.categoryTitleAr,
      categoryImage: categoryImageFor(item.categoryId),
      brandId: item.brandId ?? null,
      brandName: brand?.name ?? null,
      brandNameAr: brand?.nameAr ?? null,
      brandLogo: brand?.logo ?? null,
    };
  });
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
  return one(clone(priceBasket(state.basket)));
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
  return one(clone(priceBasket(state.basket)));
}
function changeBasketItem(itemId: number, quantity: number) {
  const items = state.basket.items ?? [];
  if (!items.some(({ id }) => id === itemId)) throw new Error('Basket item not found');
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Invalid quantity');
  state.basket.items = quantity === 0 ? items.filter(({ id }) => id !== itemId) :
    items.map((item) => item.id === itemId ? { ...item, quantity, updatedAt: now() } : item);
  state.basket.updatedAt = now();
  return one(clone(priceBasket(state.basket)));
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
  const { subtotal, discountAmount, shippingFee, taxAmount, total } = priceBasket(state.basket);
  const order: Order = {
    id, reference: 'ORD-' + String(id).padStart(6, '0'), userId: 1, addressId: payload.addressId, couponId: null,
    subtotal, discountAmount, shippingFee, taxAmount, total, status: 'confirmed',
    paymentMethod: payload.paymentMethod, paymentStatus: 'pending', notes: payload.notes ?? null,
    confirmedBy: null, confirmedAt: timestamp, createdAt: timestamp, updatedAt: timestamp, items,
  };
  state.orders.unshift(order);
  if (state.basket.requestId !== null) {
    const request = requestById(state.basket.requestId); request.status = 'ordered'; request.updatedAt = timestamp;
  }
  state.basket = priceBasket({ ...state.basket, requestId: null, items: [], updatedAt: timestamp });
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

function purchaseOrderStatus(items: PrestataireOrder['items']): PurchaseOrderStatus {
  const statuses = items.map((item) => item.purchaseOrder.status);
  if (statuses.every((status) => status === 'received')) return 'received';
  if (statuses.every((status) => status === 'shipped' || status === 'received')) return 'shipped';
  return ['sent', 'acknowledged', 'preparing', 'ready']
    .find((status) => statuses.includes(status as PurchaseOrderStatus)) as PurchaseOrderStatus ?? 'cancelled';
}
function transitionPurchaseOrder(
  purchaseOrderId: number,
  status: 'acknowledged' | 'preparing' | 'shipped',
  payload?: ShipOfferPayload,
) {
  for (const order of state.partnerOrders) {
    const item = order.items.find(({ purchaseOrder }) => purchaseOrder.id === purchaseOrderId);
    if (!item) continue;
    if (status === 'shipped' && !payload?.trackingNumber.trim()) throw new Error('Tracking number is required');
    const timestamp = now();
    const updated: PrestatairePurchaseOrder = {
      ...item.purchaseOrder,
      status,
      trackingNumber: status === 'shipped' ? payload!.trackingNumber.trim() : item.purchaseOrder.trackingNumber,
      carrier: status === 'shipped' ? payload?.carrier?.trim() || null : item.purchaseOrder.carrier,
      shippingNotes: status === 'shipped' ? payload?.notes?.trim() || null : item.purchaseOrder.shippingNotes,
      shippedAt: status === 'shipped' ? timestamp : item.purchaseOrder.shippedAt,
      updatedAt: timestamp,
    };
    item.purchaseOrder = updated;
    item.status = status === 'shipped' ? 'shipped' : status === 'preparing' ? 'preparing' : item.status;
    item.updatedAt = timestamp;
    order.fulfillmentStatus = purchaseOrderStatus(order.items);
    if (order.items.every(({ purchaseOrder }) => ['shipped', 'received'].includes(purchaseOrder.status))) order.status = 'shipped';
    order.updatedAt = timestamp;
    return one(clone(updated));
  }
  throw new Error('Purchase order not found');
}
function requestWithdrawal(payload: RequestWithdrawalPayload) {
  const amount = roundMoney(payload.amount);
  if (!Number.isFinite(payload.amount) || payload.amount <= 0 || amount !== payload.amount) {
    throw new Error('Invalid withdrawal amount');
  }
  if (amount > state.wallet.balance) throw new Error('Withdrawal amount exceeds balance');
  const method = payload.method ?? 'virement';
  if (!['virement', 'cheque', 'cash'].includes(method)) throw new Error('Invalid withdrawal method');

  const timestamp = now();
  const bank = state.withdrawals.find((row) => row.method === 'virement' && row.bankIban);
  const withdrawal: Withdrawal = {
    id: nextId(state.withdrawals),
    userId: 10,
    amount,
    bankIban: method === 'virement' ? bank?.bankIban ?? null : null,
    bankName: method === 'virement' ? bank?.bankName ?? null : null,
    method,
    status: 'awaiting_verification',
    adminNotes: null,
    processedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  state.withdrawals.unshift(withdrawal);
  return one({ withdrawal: clone(withdrawal), requiresVerification: true });
}

function confirmWithdrawal(id: number, payload: ConfirmWithdrawalPayload) {
  if (!/^\d{6}$/.test(payload.code)) throw new Error('Invalid withdrawal verification code');
  const withdrawal = state.withdrawals.find((row) => row.id === id && row.userId === 10);
  if (!withdrawal) throw new Error('Withdrawal not found');
  if (withdrawal.status !== 'awaiting_verification') throw new Error('Withdrawal cannot be confirmed');
  withdrawal.status = 'pending';
  withdrawal.updatedAt = now();
  return one(clone(withdrawal));
}

function cancelOrder(id: number) {
  const order = state.orders.find((row) => row.id === id);
  if (!order || order.status !== 'pending') throw new Error('Order cannot be cancelled');
  order.status = 'cancelled';
  order.updatedAt = now();
  return one(clone(order));
}
function addAddress(payload: AddAddressPayload) {
  if (!payload.addressLine1.trim() || !payload.city.trim()) throw new Error('Invalid address');
  const timestamp = now();
  const address: Address = { id: nextId(state.addresses), userId: 1, label: payload.label ?? null, addressLine1: payload.addressLine1.trim(), addressLine2: payload.addressLine2?.trim() || null, city: payload.city.trim(), postalCode: payload.postalCode?.trim() || null, region: payload.region?.trim() || null, country: payload.country?.trim() || 'Morocco', latitude: null, longitude: null, isDefault: state.addresses.length === 0, createdAt: timestamp, updatedAt: timestamp };
  state.addresses.unshift(address);
  return one(clone(address));
}function updateAddress(id: number, payload: UpdateAddressPayload) {
  const address = state.addresses.find((row) => row.id === id);
  if (!address) throw new Error('Address not found');
  if ((payload.addressLine1 !== undefined && !payload.addressLine1.trim()) || (payload.city !== undefined && !payload.city.trim())) throw new Error('Invalid address');
  Object.assign(address, payload, { updatedAt: now() });
  return one(clone(address));
}
function deleteAddress(id: number) {
  const index = state.addresses.findIndex((row) => row.id === id);
  if (index < 0) throw new Error('Address not found');
  state.addresses.splice(index, 1);
  return one({ deleted: true });
}
function setDefaultAddress(id: number) {
  const address = state.addresses.find((row) => row.id === id);
  if (!address) throw new Error('Address not found');
  state.addresses.forEach((row) => { row.isDefault = row.id === id; });
  return one(clone(address));
}
function addVehicle(payload: AddVehiclePayload) {
  if (!Number.isInteger(payload.brandId) || !Number.isInteger(payload.modelId) || !Number.isInteger(payload.year)) throw new Error('Invalid vehicle');
  const brand = mockCarBrands.find((row) => row.id === payload.brandId);
  const model = mockCarModels.find((row) => row.id === payload.modelId && row.brandId === payload.brandId);
  if (!brand || !model) throw new Error('Invalid vehicle');
  const motorization = payload.motorizationId === undefined ? undefined : mockCarMotorizations.find((row) => row.id === payload.motorizationId);
  if (payload.motorizationId !== undefined && !motorization) throw new Error('Invalid vehicle');
  const timestamp = now();
  const vehicle: Vehicle = { id: nextId(state.vehicles), userId: 1, brandId: brand.id, modelId: model.id, motorizationId: motorization?.id ?? null, year: payload.year, vin: null, licensePlate: null, nickname: payload.nickname?.trim() || null, imageUrl: null, isDefault: state.vehicles.length === 0, createdAt: timestamp, updatedAt: timestamp, brandName: brand.name, modelName: model.name, motorizationName: motorization?.name ?? null };
  state.vehicles.unshift(vehicle);
  return one(clone(vehicle));
}
function deleteVehicle(id: number) {
  const index = state.vehicles.findIndex((row) => row.id === id);
  if (index < 0) throw new Error('Vehicle not found');
  state.vehicles.splice(index, 1);
  return one({ deleted: true });
}function postReview(productId: number, payload: { rating: number; title: string; comment?: string }) {
  if (!mockProducts.some((product) => product.id === productId) || !Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5 || !payload.title.trim()) throw new Error('Invalid review');
  const timestamp = now();
  const review: Review = { id: nextId(state.reviews), reviewerId: 1, reviewableType: 'order_item', reviewableId: productId, rating: payload.rating as 1 | 2 | 3 | 4 | 5, title: payload.title.trim(), comment: payload.comment?.trim() || null, createdAt: timestamp, updatedAt: timestamp, reviewerName: 'Vous', reviewerAvatar: null };
  state.reviews.unshift(review);
  return one(clone(review));
}function productPage(path: string): Paginated<(typeof mockProducts)[number]> {
  const query = new URLSearchParams(path.split('?')[1] ?? '');
  const categoryId = Number(query.get('categoryId'));
  const condition = query.get('condition');
  const search = query.get('q')?.trim().toLocaleLowerCase();
  let rows = mockProducts.filter((product) =>
    product.categoryId === categoryId &&
    (!condition || product.condition === condition) &&
    (!search || [product.title, product.titleAr, product.articleNumber]
      .some((value) => value.toLocaleLowerCase().includes(search)))
  );

  const sort = query.get('sort');
  rows = [...rows].sort((left, right) =>
    sort === 'priceAsc' ? left.price - right.price :
      sort === 'priceDesc' ? right.price - left.price :
        sort === 'rating' ? (right.rating ?? 0) - (left.rating ?? 0) :
          sort === 'recent' ? right.createdAt.localeCompare(left.createdAt) : 0
  );
  // ponytail: fixtures do not model featured ranking; add isFeatured if that distinction is needed.
  const requestedPage = Number(query.get('page'));
  const requestedPerPage = Number(query.get('perPage'));
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const perPage = Number.isInteger(requestedPerPage) && requestedPerPage > 0
    ? requestedPerPage
    : DEFAULT_PAGE_SIZE;
  const start = (currentPage - 1) * perPage;
  const data = clone(rows.slice(start, start + perPage));
  return {
    success: true,
    data,
    pagination: {
      total: rows.length,
      perPage,
      currentPage,
      lastPage: Math.max(1, Math.ceil(rows.length / perPage)),
      from: data.length ? start + 1 : 0,
      to: start + data.length,
    },
  };
}
function pneumaticPage(path: string): Paginated<Pneumatic> {
  const query = new URLSearchParams(path.split('?')[1] ?? '');
  const numberParam = (key: string) => {
    const value = query.get(key);
    return value === null ? null : Number(value);
  };
  const width = numberParam('width');
  const aspectRatio = numberParam('aspectRatio');
  const diameter = numberParam('diameter');
  const season = query.get('season');
  const vehicleType = query.get('vehicleType');
  const brand = query.get('brand')?.trim().toLocaleLowerCase();
  const speedRating = query.get('speedRating')?.trim().toLocaleUpperCase();
  const search = query.get('q')?.trim().toLocaleLowerCase();
  let rows = mockPneumatics.filter((pneumatic) =>
    (width === null || pneumatic.width === width) &&
    (aspectRatio === null || pneumatic.aspectRatio === aspectRatio) &&
    (diameter === null || pneumatic.diameter === diameter) &&
    (!season || pneumatic.season === season) &&
    (!vehicleType || pneumatic.vehicleType === vehicleType) &&
    (!brand || pneumatic.brand.toLocaleLowerCase().includes(brand)) &&
    (!speedRating || pneumatic.speedRating === speedRating) &&
    (!search || [pneumatic.brand, pneumatic.model].some((value) => value.toLocaleLowerCase().includes(search)))
  );
  const sort = query.get('sort');
  rows = [...rows].sort((left, right) => sort === 'priceAsc' ? left.price - right.price : sort === 'priceDesc' ? right.price - left.price : 0);
  return page(clone(rows));
}
export function handleGoldenRequest(method: string, path: string, body?: unknown): Envelope | undefined {
  if (method === 'GET' && path.startsWith('/products?')) return productPage(path);
  if (method === 'GET' && path.startsWith('/pneumatics')) return pneumaticPage(path);
  if (method === 'GET' && path === '/vehicles') return page(clone(state.vehicles));
  if (method === 'POST' && path === '/vehicles') return addVehicle(body as AddVehiclePayload);
  if (method === 'GET' && path === '/addresses') return page(clone(state.addresses));
  if (method === 'POST' && path === '/addresses') return addAddress(body as AddAddressPayload);
  if (method === 'GET' && path === '/requests') return page(state.requests.map(summary));
  if (method === 'POST' && path === '/requests') return createRequest(body as CreateRequestPayload);
  if (method === 'GET' && path === '/basket') return one(clone(state.basket));
  if (method === 'POST' && path === '/basket/items') {
    const value = body as { productId: number; quantity: number }; return addProduct(value.productId, value.quantity);
  }
  if (method === 'POST' && path === '/orders') return placeOrder(body as PlaceOrderPayload);
  if (method === 'GET' && path === '/orders') return page(clone(state.orders));
  if (method === 'GET' && path === '/prestataire/incoming-requests') return page(clone(state.requests.filter(({ status }) => status === 'pending')));
  if (method === 'GET' && path === '/prestataire/wallet') return one(clone(state.wallet));
  if (method === 'GET' && path === '/prestataire/wallet/withdrawals') return page(clone(state.withdrawals));
  if (method === 'POST' && path === '/prestataire/wallet/withdraw') return requestWithdrawal(body as RequestWithdrawalPayload);
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
    return page(clone(state.partnerOrders.filter((order) => !status || (status === 'accepted' ? order.status === 'confirmed' : order.status === status))));
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
  match = path.match(/^\/vehicles\/(\d+)$/);
  if (method === 'DELETE' && match) return deleteVehicle(Number(match[1]));
  match = path.match(/^\/addresses\/(\d+)$/);
  if (method === 'GET' && match) { const addressId = Number(match[1]); const row = state.addresses.find((item) => item.id === addressId); if (!row) throw new Error('Address not found'); return one(clone(row)); }
  if (method === 'PUT' && match) return updateAddress(Number(match[1]), body as UpdateAddressPayload);
  if (method === 'DELETE' && match) return deleteAddress(Number(match[1]));
  match = path.match(/^\/addresses\/(\d+)\/default$/);
  if (method === 'POST' && match) return setDefaultAddress(Number(match[1]));
  match = path.match(/^\/orders\/(\d+)\/cancel$/);
  if (method === 'POST' && match) return cancelOrder(Number(match[1]));
  match = path.match(/^\/products\/(\d+)\/reviews$/);
  if (method === 'POST' && match) return postReview(Number(match[1]), body as { rating: number; title: string; comment?: string });
  match = path.match(/^\/orders\/(\d+)$/);
  if (method === 'GET' && match) { const orderId = Number(match[1]); const row = state.orders.find(({ id }) => id === orderId); if (!row) throw new Error('Order not found'); return one(clone(row)); }
  match = path.match(/^\/prestataire\/requests\/(\d+)\/offers$/);
  if (method === 'POST' && match) return submitOffer(Number(match[1]), body as SubmitOfferPayload);
  match = path.match(/^\/prestataire\/offers\/(\d+)\/shipment$/);
  if (method === 'GET' && match) { const id = Number(match[1]); offerById(id); return one(clone(state.shipments.find((row) => row.offerId === id) ?? null)); }
  match = path.match(/^\/prestataire\/offers\/(\d+)\/ship$/);
  if (method === 'POST' && match) return shipOffer(Number(match[1]), body as ShipOfferPayload);
  match = path.match(/^\/prestataire\/wallet\/withdrawals\/(\d+)\/confirm$/);
  if (method === 'POST' && match) return confirmWithdrawal(Number(match[1]), body as ConfirmWithdrawalPayload);
  match = path.match(/^\/prestataire\/offers\/(\d+)$/);
  if (method === 'GET' && match) return one(clone(toPrestataireOffer(offerById(Number(match[1])))));
  match = path.match(/^\/prestataire\/purchase-orders\/(\d+)\/(acknowledge|prepare|ship)$/);
  if (method === 'POST' && match) {
    const status = match[2] === 'acknowledge' ? 'acknowledged' : match[2] === 'prepare' ? 'preparing' : 'shipped';
    return transitionPurchaseOrder(Number(match[1]), status, body as ShipOfferPayload | undefined);
  }  match = path.match(/^\/prestataire\/orders\/(\d+)$/);
  if (method === 'GET' && match) { const orderId = Number(match[1]); const row = state.partnerOrders.find(({ id }) => id === orderId); if (!row) throw new Error('Order not found'); return one(clone(row)); }
  return undefined;
}
