import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventory.service';
import { ServiceItem, ProductItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Package, Scissors, Plus, PlusCircle, MinusCircle, AlertTriangle, X, Trash2, Layers, Coffee } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const InventoryView: React.FC = () => {
  const [tab, setTab] = useState<'services' | 'products' | 'articles'>('services');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal crear servicio / producto / artículo
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productType, setProductType] = useState<'salon' | 'article'>('salon');

  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(0);

  // Opciones de precio para servicios (ej. Niño, Joven, Adulto)
  const [hasMultiplePrices, setHasMultiplePrices] = useState(false);
  const [serviceVariantsList, setServiceVariantsList] = useState<Array<{ name: string; price: number }>>([
    { name: 'Niño', price: 0 },
    { name: 'Joven', price: 0 },
    { name: 'Adulto', price: 0 },
  ]);

  const [newProductName, setNewProductName] = useState('');
  const [newProductSalePrice, setNewProductSalePrice] = useState<number>(0);
  const [newProductCostPrice, setNewProductCostPrice] = useState<number>(0);
  const [newProductStock, setNewProductStock] = useState<number>(10);
  const [newProductSku, setNewProductSku] = useState('');

  const { notify } = useApp();

  useEffect(() => {
    loadData();
  }, []);

const loadData = async () => {
  try {
    setLoading(true);
    const [srv, prd] = await Promise.all([
      inventoryService.listServices(),
      inventoryService.listProducts(),
    ]);
    setServices(srv || []);
    setProducts(
      (prd || []).map((p: any) => ({
        ...p,
        stock: Number(p.stock) || 0,
        min_stock: Number(p.min_stock) || 0,
        cost_price: Number(p.cost_price) || 0,
        sale_price: Number(p.sale_price) || 0,
      }))
    );
  } catch (err: any) {
    notify('Error cargando catálogo: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
};

  const isArticle = (p: ProductItem) => {
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

  const salonProducts = products.filter((p) => !isArticle(p));
  const articleProducts = products.filter((p) => isArticle(p));

  const handleAddVariantRow = () => {
    setServiceVariantsList([...serviceVariantsList, { name: '', price: 0 }]);
  };

  const handleUpdateVariantRow = (index: number, field: 'name' | 'price', value: any) => {
    const updated = [...serviceVariantsList];
    updated[index] = { ...updated[index], [field]: field === 'price' ? Number(value) : value };
    setServiceVariantsList(updated);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (serviceVariantsList.length <= 1) return;
    setServiceVariantsList(serviceVariantsList.filter((_, i) => i !== index));
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    try {
      let validVariants: Array<{ name: string; price: number }> = [];

      if (hasMultiplePrices) {
        validVariants = serviceVariantsList
          .filter((v) => v.name.trim() && Number(v.price) > 0)
          .map((v) => ({ name: v.name.trim(), price: Number(v.price) }));

        if (validVariants.length === 0) {
          notify('Debe definir al menos una opción de precio con valor mayor a 0 (ej. Niño, Joven, Adulto).', 'error');
          return;
        }
      }

      const basePrice = hasMultiplePrices && validVariants.length > 0
        ? validVariants[0].price
        : Number(newServicePrice);

      await inventoryService.createService({
        name: newServiceName.trim(),
        price: basePrice,
        variants: validVariants.length > 0 ? validVariants : undefined,
      });

      notify('Servicio agregado exitosamente', 'success');
      setShowServiceModal(false);
      setNewServiceName('');
      setNewServicePrice(0);
      setHasMultiplePrices(false);
      setServiceVariantsList([
        { name: 'Niño', price: 0 },
        { name: 'Joven', price: 0 },
        { name: 'Adulto', price: 0 },
      ]);
      loadData();
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    try {
      const cleanCode = newProductSku.trim();
      const isArt = productType === 'article';
      await inventoryService.createProduct({
        name: newProductName.trim(),
        sale_price: Number(newProductSalePrice),
        cost_price: Number(newProductCostPrice),
        stock: Number(newProductStock),
        barcode: cleanCode || undefined,
        sku: cleanCode || undefined,
        category_id: isArt ? 'cat-cafe-01' : undefined,
        description: isArt ? 'Artículo de Cafetería y Snacks' : undefined,
      });
      notify(
        isArt
          ? 'Artículo de cafetería agregado exitosamente. Ya está disponible en la sección "Artículos" de Ventas.'
          : 'Producto de salón agregado exitosamente. Ya está disponible en la sección "Productos" de Ventas.',
        'success'
      );
      setShowProductModal(false);
      setNewProductName('');
      setNewProductSalePrice(0);
      setNewProductCostPrice(0);
      setNewProductStock(10);
      setNewProductSku('');
      loadData();
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    try {
      await inventoryService.adjustStock(id, delta);
      notify('Stock actualizado', 'info');
      loadData();
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Catálogo & Control de Stock
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestiona los servicios ofrecidos, productos de salón y artículos de cafetería
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setTab('services')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'services'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Servicios ({services.length})</span>
            </button>
            <button
              onClick={() => setTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'products'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Productos Salón ({salonProducts.length})</span>
            </button>
            <button
              onClick={() => setTab('articles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                tab === 'articles'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Artículos / Cafetería ({articleProducts.length})</span>
            </button>
          </div>

          {tab === 'services' && (
            <button
              onClick={() => setShowServiceModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Nuevo Servicio
            </button>
          )}

          {tab === 'products' && (
            <button
              onClick={() => {
                setProductType('salon');
                setShowProductModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          )}

          {tab === 'articles' && (
            <button
              onClick={() => {
                setProductType('article');
                setShowProductModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-amber-600/20"
            >
              <Plus className="w-4 h-4" />
              Nuevo Artículo
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-x-auto flex-1">
          {tab === 'services' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nombre del Servicio</th>
                  <th className="py-3.5 px-4">Modalidad</th>
                  <th className="py-3.5 px-4">Precios de Venta</th>
                  <th className="py-3.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
                {services.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Scissors className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {srv.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {srv.variants && srv.variants.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium text-[11px] border border-indigo-200 dark:border-indigo-800/60">
                          <Layers className="w-3.5 h-3.5" />
                          {srv.variants.length} opciones
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">Precio único</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {srv.variants && srv.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {srv.variants.map((v) => (
                            <span
                              key={v.id || v.name}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-[11px]"
                            >
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{v.name}:</span>{' '}
                              <strong className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(v.price)}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(srv.price)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px]">
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'products' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Producto de Salón</th>
                  <th className="py-3.5 px-4">Código / SKU</th>
                  <th className="py-3.5 px-4">Costo</th>
                  <th className="py-3.5 px-4">Precio Venta</th>
                  <th className="py-3.5 px-4">Stock Actual</th>
                  <th className="py-3.5 px-4 text-right">Ajuste de Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
                {salonProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay productos de salón registrados.
                    </td>
                  </tr>
                ) : (
                  salonProducts.map((prd) => (
                    <tr key={prd.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        {prd.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {prd.barcode || prd.sku || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatCurrency(prd.cost_price)}</td>
                      <td className="py-3.5 px-4 font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(prd.sale_price)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              prd.stock <= prd.min_stock
                                ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {prd.stock} unid.
                          </span>
                          {prd.stock <= prd.min_stock && (
                            <span title="Stock bajo">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleAdjustStock(prd.id, -1)}
                            className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Restar 1 unidad"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(prd.id, 1)}
                            className="p-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Sumar 1 unidad"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-semibold border-b border-amber-200/60 dark:border-amber-900/40 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Artículo de Cafetería / Snack</th>
                  <th className="py-3.5 px-4">Código / SKU</th>
                  <th className="py-3.5 px-4">Costo</th>
                  <th className="py-3.5 px-4">Precio Venta</th>
                  <th className="py-3.5 px-4">Stock Actual</th>
                  <th className="py-3.5 px-4 text-right">Ajuste de Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
                {articleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay artículos de cafetería registrados.
                    </td>
                  </tr>
                ) : (
                  articleProducts.map((art) => (
                    <tr key={art.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        {art.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                        {art.barcode || art.sku || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatCurrency(art.cost_price)}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">{formatCurrency(art.sale_price)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              art.stock <= art.min_stock
                                ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                            }`}
                          >
                            {art.stock} unid.
                          </span>
                          {art.stock <= art.min_stock && (
                            <span title="Stock bajo">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleAdjustStock(art.id, -1)}
                            className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Restar 1 unidad"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(art.id, 1)}
                            className="p-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Sumar 1 unidad"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL CREAR SERVICIO */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateService} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Agregar Nuevo Servicio
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Registra el servicio y define su precio único o diferentes opciones
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mb-5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  Nombre del Servicio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Corte de Cabello, Peinado, Manicura..."
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Selector de tipo de precio: Único vs Opciones múltiples */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1.5 font-semibold">
                  Modalidad de Precios
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setHasMultiplePrices(false)}
                    className={`py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer text-xs ${
                      !hasMultiplePrices
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Precio Único
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasMultiplePrices(true)}
                    className={`py-1.5 px-3 rounded-lg font-semibold transition cursor-pointer text-xs ${
                      hasMultiplePrices
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Múltiples Opciones (Niño, Joven, Adulto...)
                  </button>
                </div>
              </div>

              {!hasMultiplePrices ? (
                <div>
                  <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                    Precio de Venta (₲) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="50000"
                    value={newServicePrice || ''}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-200">Opciones y Precios por Categoría</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Configura las opciones con sus respectivos precios
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVariantRow}
                      className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-[11px] font-bold border border-indigo-200 dark:border-indigo-800/60 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar opción
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {serviceVariantsList.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Ej. Niño, Joven, Adulto..."
                            value={v.name}
                            onChange={(e) => handleUpdateVariantRow(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="w-36">
                          <input
                            type="number"
                            min="0"
                            placeholder="Precio (₲)"
                            value={v.price || ''}
                            onChange={(e) => handleUpdateVariantRow(idx, 'price', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-bold text-xs focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        {serviceVariantsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition cursor-pointer"
                            title="Eliminar opción"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-sm shadow-indigo-600/20"
              >
                Guardar Servicio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CREAR PRODUCTO / ARTÍCULO */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {productType === 'article' ? (
                    <>
                      <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Agregar Artículo (Cafetería / Dulces)
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      Agregar Producto de Salón
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {productType === 'article'
                    ? 'Se enviará directamente al menú "Artículos" en el Punto de Venta'
                    : 'Se enviará directamente al menú "Productos Salón" en el Punto de Venta'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              {/* Selector de Destino / Tipo de Catálogo */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  Destino en el Menú de Ventas *
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setProductType('salon')}
                    className={`py-1.5 px-2.5 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center justify-center gap-1.5 ${
                      productType === 'salon'
                        ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Producto de Salón</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductType('article')}
                    className={`py-1.5 px-2.5 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center justify-center gap-1.5 ${
                      productType === 'article'
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Artículo (Café / Dulces)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-400 block mb-1 font-semibold">
                  {productType === 'article' ? 'Nombre del Artículo *' : 'Nombre del Producto *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    productType === 'article'
                      ? 'Ej. Café Espresso, Alfajor Artesanal, Masitas Dulces...'
                      : 'Ej. Cera Modeladora Mate, Shampoo Anticaída...'
                  }
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-400 block mb-1 font-semibold">Precio Venta (₲) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="15000"
                    value={newProductSalePrice || ''}
                    onChange={(e) => setNewProductSalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-400 block mb-1">Costo Unitario (₲)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="8000"
                    value={newProductCostPrice || ''}
                    onChange={(e) => setNewProductCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 dark:text-slate-400 block mb-1 font-semibold">Stock Inicial</label>
                  <input
                    type="number"
                    min="0"
                    value={newProductStock}
                    onChange={(e) => setNewProductStock(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-700 dark:text-slate-400 block mb-1">
                    Código de Barra / SKU <span className="text-[10px] text-slate-500">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Auto: 1, 2, 3..."
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                * Si no ingresas un código de barras o SKU, el sistema asignará automáticamente el número correlativo que empieza en 1.
              </p>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white font-semibold rounded-xl cursor-pointer shadow-sm transition ${
                  productType === 'article'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20'
                }`}
              >
                {productType === 'article' ? 'Guardar Artículo' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
