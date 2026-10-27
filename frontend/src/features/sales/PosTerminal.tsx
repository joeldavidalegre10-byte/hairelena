import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { inventoryService } from '../../services/inventory.service';
import { stylistsService } from '../../services/stylists.service';
import { salesService } from '../../services/sales.service';
import { ServiceItem, ProductItem, Stylist, PaymentMethod, ServiceVariant } from '../../types';
import { formatCurrency, formatParaguayThousands, parseParaguayNumber } from '../../utils/formatters';
import {
  Search,
  Scissors,
  Package,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  ShoppingCart,
  ShoppingBag,
  AlertCircle,
  ArrowRightLeft,
  UserCheck,
  User,
  X,
  Lock,
  Unlock,
  Tag,
  ChevronRight,
  Sparkles,
  Barcode,
  Check,
  Coffee,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const PosTerminal: React.FC = () => {
  const {
    cart,
    addToCart,
    updateCartItemQty,
    removeCartItem,
    assignCartStylist,
    clearCart,
    discount,
    setDiscount,
    cartSubtotal,
    cartTotal,
    notify,
    currentRegister,
    refreshRegister,
    user,
  } = useApp();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [activeCatalogTab, setActiveCatalogTab] = useState<'services' | 'articles' | 'products' | 'all'>('services');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Selección de Precio / Modalidad del Servicio antes de asignar Estilista
  const [selectedServiceForPrice, setSelectedServiceForPrice] = useState<ServiceItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ServiceVariant | null>(null);
  const [selectedServicePrice, setSelectedServicePrice] = useState<number>(0);

  // Modal de Selección Obligatoria de Estilista al seleccionar un Servicio
  const [selectedServiceForStylist, setSelectedServiceForStylist] = useState<ServiceItem | null>(null);
  const [selectedStylistId, setSelectedStylistId] = useState<string>('');
  const [stylistSearchTerm, setStylistSearchTerm] = useState<string>('');

  // Estado del Modal de Cobro
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashInputValue, setCashInputValue] = useState<string>('');
  const [cashNumeric, setCashNumeric] = useState<number>(0);

  // Pago Mixto
  const [mixedCashValue, setMixedCashValue] = useState<string>('');
  const [mixedCashNumeric, setMixedCashNumeric] = useState<number>(0);
  const [mixedOtherMethod, setMixedOtherMethod] = useState<'card' | 'transfer'>('card');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<any>(null);

  const cashInputRef = useRef<HTMLInputElement>(null);
  const mixedCashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const [srvData, prdData, styData] = await Promise.all([
        inventoryService.listServices(),
        inventoryService.listProducts(),
        stylistsService.list(),
      ]);
      setServices(srvData || []);
      setProducts(prdData || []);
      setStylists(styData || []);
    } catch (err: any) {
      notify('Error al cargar catálogo: ' + err.message, 'error');
    }
  };

  const isArticleItem = (p: ProductItem) => {
    return (
      p.category_id === 'cat-cafe-01' ||
      p.description?.toLowerCase().includes('refrigerio') ||
      p.name.toLowerCase().includes('café') ||
      p.name.toLowerCase().includes('cafe') ||
      p.name.toLowerCase().includes('alfajor') ||
      p.name.toLowerCase().includes('dulce') ||
      p.name.toLowerCase().includes('gaseosa') ||
      p.name.toLowerCase().includes('masita') ||
      p.name.toLowerCase().includes('snack')
    );
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm)) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredArticles = filteredProducts.filter((p) => isArticleItem(p));
  const filteredSalonProducts = filteredProducts.filter((p) => !isArticleItem(p));

  const activeStylists = stylists.filter((s) => s.is_active);
  const filteredActiveStylists = activeStylists.filter((s) =>
    s.full_name.toLowerCase().includes(stylistSearchTerm.toLowerCase())
  );

  // Al hacer clic en un producto (Adición directa inmediata)
  const handleProductClick = (prd: ProductItem) => {
    if (prd.stock <= 0) {
      notify(`El producto "${prd.name}" no tiene stock disponible`, 'error');
      return;
    }
    // Incorporación directa al carrito sin alertas ni modales innecesarios
    addToCart(prd, 'product');
  };

  // Al hacer clic en un servicio:
  // Si el servicio cuenta con múltiples opciones de precio configuradas, abre primero el modal de precios.
  // Si tiene un único precio, abre directamente el modal para elegir al estilista.
  const handleServiceClick = (srv: ServiceItem) => {
    if (srv.variants && srv.variants.length > 1) {
      setSelectedServiceForPrice(srv);
      setSelectedVariant(null);
      setSelectedServicePrice(srv.price);
    } else {
      const singleVariant = srv.variants && srv.variants.length === 1 ? srv.variants[0] : null;
      setSelectedServiceForPrice(null);
      setSelectedServiceForStylist(srv);
      setSelectedVariant(singleVariant);
      setSelectedServicePrice(singleVariant ? singleVariant.price : srv.price);
      setSelectedStylistId('');
      setStylistSearchTerm('');
    }
  };

  // Al elegir una opción en el modal de precios:
  // Cierra el modal de precios y abre inmediatamente el modal de selección de estilista.
  const handleSelectPriceVariant = (variant: ServiceVariant) => {
    if (!selectedServiceForPrice) return;
    const srv = selectedServiceForPrice;
    setSelectedServiceForPrice(null);
    setSelectedServiceForStylist(srv);
    setSelectedVariant(variant);
    setSelectedServicePrice(variant.price);
    setSelectedStylistId('');
    setStylistSearchTerm('');
  };

  const handleCancelPriceSelection = () => {
    setSelectedServiceForPrice(null);
    setSelectedVariant(null);
  };

  // Confirmar estilista seleccionado para el servicio (con variante y precio elegidos)
  const handleConfirmServiceStylist = () => {
    if (!selectedServiceForStylist) return;
    if (!selectedStylistId) {
      notify('Debes seleccionar un estilista para realizar este servicio', 'error');
      return;
    }

    const stylist = stylists.find((s) => s.id === selectedStylistId);
    if (!stylist) return;

    // Agregar al carrito con el estilista y la variante/precio seleccionados
    addToCart(
      selectedServiceForStylist,
      'service',
      stylist.id,
      stylist.full_name,
      selectedVariant?.id,
      selectedVariant?.name,
      selectedServicePrice || selectedServiceForStylist.price
    );

    // Cerrar modal
    setSelectedServiceForStylist(null);
    setSelectedVariant(null);
    setSelectedStylistId('');
  };

  const handleCancelServiceStylist = () => {
    setSelectedServiceForStylist(null);
    setSelectedVariant(null);
    setSelectedStylistId('');
  };

  const isRegisterOpen = currentRegister?.status === 'open';

  const handleOpenCheckout = () => {
    if (!isRegisterOpen) {
      notify('La caja registradora se encuentra cerrada. No es posible cobrar.', 'error');
      return;
    }

    if (cart.length === 0) {
      notify('El carrito está vacío. Agrega servicios o productos.', 'error');
      return;
    }

    // Validar que todos los servicios tengan estilista asignado
    const servicesWithoutStylist = cart.filter((it) => it.item_type === 'service' && !it.stylist_id);
    if (servicesWithoutStylist.length > 0) {
      notify(`El servicio "${servicesWithoutStylist[0].name}" no tiene un estilista asignado`, 'error');
      return;
    }

    // Inicializar monto en efectivo con el total exacto formateado
    setCashNumeric(cartTotal);
    setCashInputValue(formatParaguayThousands(cartTotal));

    // Inicializar pago mixto
    const half = Math.round(cartTotal / 2);
    setMixedCashNumeric(half);
    setMixedCashValue(formatParaguayThousands(half));

    setIsCheckoutOpen(true);
  };

  // Manejo de entrada con separador de miles Paraguay y preservación de cursor
  const handleCashChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setterFormatted: (val: string) => void,
    setterNumeric: (val: number) => void
  ) => {
    const input = e.target;
    const rawValue = input.value;
    const oldCursor = input.selectionStart || 0;

    const digitsBeforeCursor = rawValue.slice(0, oldCursor).replace(/\D/g, '').length;

    const numeric = parseParaguayNumber(rawValue);
    setterNumeric(numeric);

    if (!rawValue.replace(/\D/g, '')) {
      setterFormatted('');
      return;
    }

    const formatted = formatParaguayThousands(numeric);
    setterFormatted(formatted);

    // Restaurar posición exacta del cursor en el siguiente frame
    requestAnimationFrame(() => {
      let newCursor = 0;
      let countedDigits = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          countedDigits++;
        }
        if (countedDigits === digitsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }
      if (digitsBeforeCursor === 0) newCursor = 0;
      input.setSelectionRange(newCursor, newCursor);
    });
  };

  // Validaciones de cobro
  const isCashInsufficient = paymentMethod === 'cash' && cashNumeric < cartTotal;
  const cashChangeDue = Math.max(0, cashNumeric - cartTotal);

  // Para pago mixto:
  const mixedOtherAmount = Math.max(0, cartTotal - mixedCashNumeric);
  const isMixedInvalid = paymentMethod === 'mixed' && (mixedCashNumeric <= 0 || mixedCashNumeric >= cartTotal);

  const canConfirmSale = () => {
    if (isSubmitting) return false;
    if (!isRegisterOpen) return false;
    if (paymentMethod === 'cash') return cashNumeric >= cartTotal;
    if (paymentMethod === 'mixed') return mixedCashNumeric > 0 && mixedCashNumeric < cartTotal;
    return true; // Tarjeta y transferencia
  };

  const handleCompleteSale = async () => {
    if (!canConfirmSale()) return;

    try {
      setIsSubmitting(true);

      let paymentDetails: any = {};
      if (paymentMethod === 'cash') {
        paymentDetails = {
          tendered: cashNumeric,
          change: cashChangeDue,
        };
      } else if (paymentMethod === 'mixed') {
        paymentDetails = {
          cash: mixedCashNumeric,
          [mixedOtherMethod]: mixedOtherAmount,
        };
      }

      const payload = {
        register_id: currentRegister?.id,
        customer_name: 'Consumidor Final',
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        discount: discount,
        items: cart.map((item) => ({
          item_type: item.item_type,
          item_id: item.original_id,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          stylist_id: item.stylist_id,
        })),
      };

      const result = await salesService.create(payload);
      setSaleSuccess(result);
      clearCart();
      setIsCheckoutOpen(false);
      refreshRegister();
      loadCatalog(); // Actualizar stock de productos
    } catch (err: any) {
      notify('Error al procesar cobro: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* SECCIÓN IZQUIERDA: CATÁLOGO Y BUSCADOR */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
        {/* Cabecera del POS */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Punto de Venta
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registrar una nueva venta
            </p>
          </div>

          {/* Badge de Estado de Caja */}
          {isRegisterOpen ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              CAJA ABIERTA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 shadow-xs">
              <Lock className="w-3.5 h-3.5" />
              CAJA CERRADA
            </span>
          )}
        </div>

        {/* Buscador de ancho completo con botón Escanear [F2] de referencia */}
        <div className="relative w-full mb-3.5">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o escanear código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-28 py-2.5 bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5b63f6] transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1a1b22] text-[10px] text-slate-400 border border-slate-200 dark:border-[#262835] pointer-events-none">
            <Barcode className="w-3 h-3" />
            <span>Escanear</span>
            <span className="font-mono text-[9px] px-1 bg-slate-200 dark:bg-[#232532] rounded">F2</span>
          </div>
        </div>

        {/* ALERTA VISUAL SI LA CAJA ESTÁ CERRADA */}
        {!isRegisterOpen && (
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>
                <strong>Atención:</strong> La caja registradora se encuentra cerrada. No es posible procesar cobros de tickets hasta que se realice la apertura de turno autorizada.
              </span>
            </div>
          </div>
        )}

        {/* Filtros de Categoría */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCatalogTab('services')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeCatalogTab === 'services'
                  ? 'bg-[#5b63f6] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Servicios</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCatalogTab === 'services' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#1a1b22] text-slate-400'}`}>
                {filteredServices.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCatalogTab('articles')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeCatalogTab === 'articles'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Artículos (Café & Dulces)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCatalogTab === 'articles' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#1a1b22] text-slate-400'}`}>
                {filteredArticles.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCatalogTab('products')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeCatalogTab === 'products'
                  ? 'bg-[#5b63f6] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Productos Salón</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCatalogTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#1a1b22] text-slate-400'}`}>
                {filteredSalonProducts.length}
              </span>
            </button>
            <button
              onClick={() => setActiveCatalogTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                activeCatalogTab === 'all'
                  ? 'bg-[#5b63f6] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Todos</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCatalogTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#1a1b22] text-slate-400'}`}>
                {filteredServices.length + filteredProducts.length}
              </span>
            </button>
          </div>
          <span className="text-xs text-slate-400 hidden lg:inline">
            {activeCatalogTab === 'services'
              ? `${filteredServices.length} servicios disponibles`
              : activeCatalogTab === 'articles'
              ? `${filteredArticles.length} artículos disponibles`
              : activeCatalogTab === 'products'
              ? `${filteredSalonProducts.length} productos disponibles`
              : `${filteredServices.length + filteredProducts.length} ítems en total`}
          </span>
        </div>

        {/* Grilla de Ítems */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6">
          {/* SERVICIOS */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'services') && filteredServices.length > 0 && (
            <div>
              {activeCatalogTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <Scissors className="w-4 h-4 text-[#5b63f6]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Servicios de Salón ({filteredServices.length})
                  </h3>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredServices.map((srv, idx) => (
                  <button
                    key={srv.id}
                    onClick={() => handleServiceClick(srv)}
                    className="pos-interactive-card group relative flex flex-col justify-between p-3.5 rounded-xl bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] text-left cursor-pointer shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] border border-indigo-200 dark:border-[#2d3148] flex items-center justify-center text-[#5b63f6] dark:text-[#818cf8] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-all shadow-2xs">
                          <Scissors className="w-4 h-4" />
                        </div>
                        {srv.variants && srv.variants.length > 1 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-all shrink-0">
                            {srv.variants.length} precios
                          </span>
                        )}
                      </div>

                      <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8] transition-colors line-clamp-1 block my-2">
                        {srv.name}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-[#1f2128] flex items-center justify-between gap-1">
                      <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-[#5b63f6] dark:group-hover:text-white transition-colors">
                          {formatCurrency(
                            srv.variants && srv.variants.length > 1
                              ? Math.min(...srv.variants.map((v) => v.price))
                              : srv.price
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          SER{String(idx + 1).padStart(3, '0')}
                        </span>
                      </div>
                      <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-all flex items-center gap-1 shadow-2xs">
                        <span>{srv.variants && srv.variants.length > 1 ? 'Elegir' : 'Agregar'}</span>
                        {srv.variants && srv.variants.length > 1 ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ARTÍCULOS (CAFETERÍA & SNACKS) */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'articles') && filteredArticles.length > 0 && (
            <div>
              {activeCatalogTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <Coffee className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Artículos & Cafetería ({filteredArticles.length})
                  </h3>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredArticles.map((art, idx) => (
                  <button
                    key={art.id}
                    onClick={() => handleProductClick(art)}
                    disabled={art.stock <= 0}
                    className={`pos-interactive-card group relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                      art.stock <= 0
                        ? 'bg-slate-100 dark:bg-[#0d0e12] border-slate-200 dark:border-[#1a1b20] opacity-40 cursor-not-allowed pointer-events-none'
                        : 'bg-white dark:bg-[#121318] border-slate-200 dark:border-[#1f2128] hover:border-amber-400 dark:hover:border-amber-500/50 cursor-pointer shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all shadow-2xs">
                          <Coffee className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                            art.stock <= art.min_stock
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600'
                          }`}
                        >
                          Stock: {art.stock}
                        </span>
                      </div>

                      <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 block my-2">
                        {art.name}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-[#1f2128] flex items-center justify-between gap-1">
                      <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {formatCurrency(art.sale_price)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {art.sku || `ART${String(idx + 1).padStart(3, '0')}`}
                        </span>
                      </div>
                      {art.stock > 0 && (
                        <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all flex items-center gap-1 shadow-2xs">
                          <span>Agregar</span>
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PRODUCTOS DE SALÓN */}
          {(activeCatalogTab === 'all' || activeCatalogTab === 'products') && filteredSalonProducts.length > 0 && (
            <div>
              {activeCatalogTab === 'all' && (
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Productos de Salón ({filteredSalonProducts.length})
                  </h3>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredSalonProducts.map((prd, idx) => (
                  <button
                    key={prd.id}
                    onClick={() => handleProductClick(prd)}
                    disabled={prd.stock <= 0}
                    className={`pos-interactive-card group relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all ${
                      prd.stock <= 0
                        ? 'bg-slate-100 dark:bg-[#0d0e12] border-slate-200 dark:border-[#1a1b20] opacity-40 cursor-not-allowed pointer-events-none'
                        : 'bg-white dark:bg-[#121318] border-slate-200 dark:border-[#1f2128] cursor-pointer shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] border border-indigo-200 dark:border-[#2d3148] flex items-center justify-center text-[#5b63f6] dark:text-[#818cf8] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-all shadow-2xs">
                          <Package className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                            prd.stock <= prd.min_stock
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/40'
                              : 'bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6]'
                          }`}
                        >
                          Stock: {prd.stock}
                        </span>
                      </div>

                      <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8] transition-colors line-clamp-1 block my-2">
                        {prd.name}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-[#1f2128] flex items-center justify-between gap-1">
                      <div>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-[#5b63f6] dark:group-hover:text-white transition-colors">
                          {formatCurrency(prd.sale_price)}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {prd.sku || `PRD${String(idx + 1).padStart(3, '0')}`}
                        </span>
                      </div>
                      {prd.stock > 0 && (
                        <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-all flex items-center gap-1 shadow-2xs">
                          <span>Agregar</span>
                          <Plus className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ESTADO VACÍO SI NO HAY RESULTADOS */}
          {((activeCatalogTab === 'services' && filteredServices.length === 0) ||
            (activeCatalogTab === 'articles' && filteredArticles.length === 0) ||
            (activeCatalogTab === 'products' && filteredSalonProducts.length === 0) ||
            (activeCatalogTab === 'all' && filteredServices.length === 0 && filteredProducts.length === 0)) && (
            <div className="p-8 text-center bg-white dark:bg-[#121318] border border-slate-200 dark:border-[#1f2128] rounded-2xl">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-[#1a1b22] flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No se encontraron ítems
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? `No hay coincidencias para "${searchTerm}" en esta sección.`
                  : 'No hay elementos registrados en esta categoría.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: CARRITO (Limpio, enfocado y directo) */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-white dark:bg-slate-900/90 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between p-6 shrink-0 transition-colors duration-200">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Encabezado: «Carrito» */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1f2128] mb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-100 dark:border-[#2d3148] flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white text-sm leading-none">
                  Carrito
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {cart.length === 0 ? 'Sin items' : `${cart.reduce((acc, i) => acc + i.quantity, 0)} items`}
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition flex items-center gap-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vaciar
              </button>
            )}
          </div>

          {/* Lista de Ítems en Carrito */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#14151b] border border-slate-200 dark:border-[#1f2128] flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-inner">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">El carrito está vacío</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                  Selecciona servicios, productos o artículos del catálogo para comenzar la venta.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 rounded-2xl flex flex-col gap-2 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200 block">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {formatCurrency(item.price)} c/u
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>

                  {/* Asignación de Estilista para Servicios */}
                  {item.item_type === 'service' && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Estilista:</span>
                        <select
                          value={item.stylist_id || ''}
                          onChange={(e) => {
                            const sty = stylists.find((s) => s.id === e.target.value);
                            if (sty) assignCartStylist(item.id, sty.id, sty.full_name);
                          }}
                          className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer max-w-[170px]"
                        >
                          {activeStylists.map((s) => (
                            <option key={s.id} value={s.id}>
                              ✂ {s.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Controles de Cantidad */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-900">
                    <span className="text-[10px] text-slate-400 capitalize">
                      {item.item_type === 'service' ? 'Servicio' : 'Producto'}
                    </span>
                    <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 px-1 py-0.5 rounded-lg border border-slate-300 dark:border-slate-800 shadow-sm">
                      <button
                        onClick={() => updateCartItemQty(item.id, -1)}
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded transition cursor-pointer"
                        title="Restar"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartItemQty(item.id, 1)}
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded transition cursor-pointer"
                        title="Sumar"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeCartItem(item.id)}
                        className="p-1 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition cursor-pointer ml-1"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resumen & Botón de Cobro */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Subtotal</span>
            <span className="text-slate-800 dark:text-slate-200">{formatCurrency(cartSubtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Descuento</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">₲</span>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-24 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-right text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
            <span>Total a Cobrar</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-2xl font-extrabold tracking-tight">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0 || !isRegisterOpen}
            className={`btn-checkout-pos w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              cart.length === 0 || !isRegisterOpen
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span>
              {!isRegisterOpen ? 'Caja Cerrada (No se puede cobrar)' : `Cobrar ${formatCurrency(cartTotal)}`}
            </span>
          </button>
        </div>
      </div>

      {/* 1. MODAL DE SELECCIÓN DE PRECIO / VARIANTE DEL SERVICIO */}
      {selectedServiceForPrice && (
        <Modal
          isOpen={true}
          onClose={handleCancelPriceSelection}
          title="Seleccionar Opción de Precio"
          subtitle={`Servicio: ${selectedServiceForPrice.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedServiceForPrice.name}
                </h4>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {selectedServiceForPrice.description || 'Elige la variante, categoría o modalidad adecuada para este servicio antes de asignar al estilista responsable.'}
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Modalidades y precios disponibles:
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {selectedServiceForPrice.variants?.map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => handleSelectPriceVariant(variant)}
                  className="modal-selectable-item group relative p-3.5 rounded-xl border border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] hover:bg-slate-50/60 dark:hover:bg-[#161720] transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] border border-indigo-200 dark:border-[#2d3148] flex items-center justify-center text-[#5b63f6] dark:text-[#818cf8] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors shadow-2xs shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8] transition-colors block">
                        {variant.name}
                      </span>
                      {variant.duration_minutes ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
                          <Clock className="w-3.5 h-3.5 text-[#5b63f6]" />
                          <span>{variant.duration_minutes} min estimados</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono group-hover:text-[#5b63f6] dark:group-hover:text-white transition-colors">
                      {formatCurrency(variant.price)}
                    </span>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] font-bold text-xs group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <span>Seleccionar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={handleCancelPriceSelection}>
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. MODAL OBLIGATORIO DE SELECCIÓN DE ESTILISTA */}
      {selectedServiceForStylist && (
        <Modal
          isOpen={true}
          onClose={handleCancelServiceStylist}
          title="Asignar Estilista Responsable"
          subtitle={`Servicio: ${selectedServiceForStylist.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} · ${formatCurrency(selectedServicePrice || selectedServiceForStylist.price)}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {selectedVariant && (
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-indigo-600 text-white">
                    <Tag className="w-3 h-3" />
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    Modalidad elegida: <strong className="text-slate-900 dark:text-white">{selectedVariant.name}</strong>
                  </span>
                </div>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {formatCurrency(selectedServicePrice)}
                </span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {user?.role === 'cashier'
                ? 'Selecciona al profesional responsable de realizar este servicio:'
                : 'Selecciona al profesional responsable de realizar este trabajo para calcular sus comisiones y el margen de ganancia:'}
            </p>

            {/* Buscador de estilistas si hay más de 3 */}
            {activeStylists.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar estilista por nombre..."
                  value={stylistSearchTerm}
                  onChange={(e) => setStylistSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Lista de Estilistas Activos con el mismo hover y selección de alto contraste */}
            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
              {filteredActiveStylists.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No se encontraron estilistas activos.
                </p>
              ) : (
                filteredActiveStylists.map((st) => {
                  const isSelected = selectedStylistId === st.id;
                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStylistId(st.id)}
                      className={`modal-selectable-item group relative p-3.5 rounded-xl border transition-colors duration-150 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'is-selected border-[#5b63f6] dark:border-[#5b63f6] bg-indigo-50/50 dark:bg-[#161826]'
                          : 'border-slate-200 dark:border-[#1f2128] bg-white dark:bg-[#121318] hover:border-[#5b63f6] dark:hover:border-[#5b63f6] hover:bg-slate-50/70 dark:hover:bg-[#161720]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#5b63f6] text-white shadow-xs'
                              : 'bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6]'
                          }`}
                        >
                          {st.full_name[0]}
                        </div>
                        <div>
                          <span className={`font-bold text-xs block transition-colors ${
                            isSelected
                              ? 'text-slate-900 dark:text-white font-extrabold'
                              : 'text-slate-900 dark:text-white group-hover:text-[#5b63f6] dark:group-hover:text-[#818cf8]'
                          }`}>
                            {st.full_name}
                          </span>
                          {user?.role !== 'cashier' && st.commission_rate !== undefined ? (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Comisión: {st.commission_rate}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              Estilista profesional
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#5b63f6] text-white shadow-xs">
                            <Check className="w-3.5 h-3.5" />
                            Seleccionado
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-[#1a1b2e] text-[#5b63f6] dark:text-[#818cf8] border border-indigo-200 dark:border-[#2d3148] group-hover:bg-[#5b63f6] group-hover:text-white group-hover:border-[#5b63f6] transition-colors flex items-center gap-1">
                            <span>Elegir</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Botones de Confirmación y Cancelación */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={handleCancelServiceStylist}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!selectedStylistId}
                onClick={handleConfirmServiceStylist}
                className="gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                Confirmar y Agregar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE COBRO / CHECKOUT (Rediseñado con campo de efectivo gigante y formato Paraguay) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl relative text-slate-900 dark:text-slate-100 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-500" />
              Finalizar Cobro
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Total a pagar:{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                {formatCurrency(cartTotal)}
              </span>
            </p>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'transfer'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span>Transferencia</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('mixed')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'mixed'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-5 h-5" />
                <span>Mixto</span>
              </button>
            </div>

            {/* SECCIÓN REDISEÑADA DE INGRESO DE MONTO DE PAGO EN EFECTIVO */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 mb-5">
                <label className="block text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  Importe que entrega el cliente
                </label>

                {/* Único campo de entrada de texto, centrado, tipografía gigante y cómodo */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute left-6 text-2xl font-bold text-slate-400 pointer-events-none select-none">
                    ₲
                  </span>
                  <input
                    ref={cashInputRef}
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="0"
                    value={cashInputValue}
                    onChange={(e) => handleCashChange(e, setCashInputValue, setCashNumeric)}
                    className="w-full py-4 px-12 text-center text-3xl sm:text-4xl font-extrabold tracking-wide bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner transition"
                  />
                </div>

                {/* Estado de Vuelto o Insuficiencia */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  {isCashInsufficient ? (
                    <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold w-full justify-center">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        Importe insuficiente. Faltan{' '}
                        <strong className="underline">{formatCurrency(cartTotal - cashNumeric)}</strong>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full px-2">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Vuelto / Cambio:</span>
                      <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(cashChangeDue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECCIÓN PAGO MIXTO */}
            {paymentMethod === 'mixed' && (
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/90 mb-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Parte en Efectivo:</span>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₲</span>
                    <input
                      ref={mixedCashInputRef}
                      type="text"
                      inputMode="numeric"
                      value={mixedCashValue}
                      onChange={(e) => handleCashChange(e, setMixedCashValue, setMixedCashNumeric)}
                      className="w-full pl-8 pr-3 py-2 text-right font-bold text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Restante en {mixedOtherMethod === 'card' ? 'Tarjeta' : 'Transferencia'}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(mixedOtherAmount)}
                    </span>
                    <select
                      value={mixedOtherMethod}
                      onChange={(e) => setMixedOtherMethod(e.target.value as any)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1"
                    >
                      <option value="card">Tarjeta</option>
                      <option value="transfer">Transferencia</option>
                    </select>
                  </div>
                </div>

                {isMixedInvalid && (
                  <p className="text-[11px] text-rose-500 font-semibold text-center">
                    El monto en efectivo debe ser mayor a 0 y menor al total de la venta.
                  </p>
                )}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setIsCheckoutOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="success"
                disabled={!canConfirmSale()}
                isLoading={isSubmitting}
                onClick={handleCompleteSale}
                className="gap-2 px-6"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Cobro</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉXITO DE VENTA / TICKET GENERADO */}
      {saleSuccess && (
        <Modal
          isOpen={true}
          onClose={() => setSaleSuccess(null)}
          title="¡Venta Registrada Exitosamente!"
          subtitle={`Ticket Nº ${saleSuccess.invoice_number}`}
          maxWidth="sm"
        >
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Total Cobrado</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(saleSuccess.total)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex justify-between">
                <span>Método de Pago:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 capitalize">
                  {saleSuccess.payment_method}
                </span>
              </div>
              {saleSuccess.payment_details?.tendered && (
                <div className="flex justify-between">
                  <span>Entrega cliente:</span>
                  <span>{formatCurrency(saleSuccess.payment_details.tendered)}</span>
                </div>
              )}
              {saleSuccess.payment_details?.change > 0 && (
                <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                  <span>Vuelto entregado:</span>
                  <span>{formatCurrency(saleSuccess.payment_details.change)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Ítems cobrados:</span>
                <span className="font-semibold">{saleSuccess.items?.length || 0}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => setSaleSuccess(null)}>
              Continuar Vendiendo
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
