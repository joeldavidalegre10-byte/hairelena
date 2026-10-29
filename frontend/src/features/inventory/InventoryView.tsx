import React, { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventory.service';
import { ServiceItem, ProductItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Package, Scissors, Plus, PlusCircle, MinusCircle, AlertTriangle, X, Trash2, Layers, Coffee, Pencil, Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type VariantRow = { id?: string; name: string; price: number };
type DeleteTarget = { kind: 'service' | 'product'; id: string; name: string } | null;

const DEFAULT_VARIANTS: VariantRow[] = [{ name: '', price: 0 }];

const ARTICLE_CATEGORY_ID = 'cat-cafe-01';

export const InventoryView: React.FC = () => {
  const [tab, setTab] = useState<'services' | 'products' | 'articles'>('services');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modales crear / editar
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productType, setProductType] = useState<'salon' | 'article'>('salon');

  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(0);

  // Opciones de precio para servicios (ej. Niño, Joven, Adulto)
  const [hasMultiplePrices, setHasMultiplePrices] = useState(false);
  const [serviceVariantsList, setServiceVariantsList] = useState<VariantRow[]>(DEFAULT_VARIANTS);

  const [newProductName, setNewProductName] = useState('');
  const [newProductSalePrice, setNewProductSalePrice] = useState<number>(0);
  const [newProductCostPrice, setNewProductCostPrice] = useState<number>(0);
  const [newProductStock, setNewProductStock] = useState<number>(10);
  const [newProductSku, setNewProductSku] = useState('');

  // Modal eliminar (motivo + contraseña de administrador)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      p.category_id === ARTICLE_CATEGORY_ID ||
      p.description?.toLowerCase().includes('refrigerio') ||
      p.description?.toLowerCase().includes('cafetería') ||
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

  /* ---------------------------- SERVICIOS ---------------------------- */

  const resetServiceForm = () => {
    setEditingService(null);
    setNewServiceName('');
    setNewServicePrice(0);
    setHasMultiplePrices(false);
    setServiceVariantsList(DEFAULT_VARIANTS.map((v) => ({ ...v })));
  };

  const openNewService = () => {
    resetServiceForm();
    setShowServiceModal(true);
  };

  const openEditService = (srv: ServiceItem) => {
    const variants = srv.variants || [];
    setEditingService(srv);
    setNewServiceName(srv.name);
    setNewServicePrice(Number(srv.price) || 0);
    if (variants.length > 0) {
      setHasMultiplePrices(true);
      setServiceVariantsList(variants.map((v) => ({ id: v.id, name: v.name, price: Number(v.price) || 0 })));
    } else {
      setHasMultiplePrices(false);
      setServiceVariantsList(DEFAULT_VARIANTS.map((v) => ({ ...v })));
    }
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    resetServiceForm();
  };

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

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    try {
      let validVariants: VariantRow[] = [];

      if (hasMultiplePrices) {
        validVariants = serviceVariantsList
          .filter((v) => v.name.trim() && Number(v.price) > 0)
          .map((v) => ({ id: v.id, name: v.name.trim(), price: Number(v.price) }));

        if (validVariants.length === 0) {
          notify('Debe definir al menos una opción de precio con valor mayor a 0 (ej. Niño, Joven, Adulto).', 'error');
          return;
        }
      }

      const basePrice = hasMultiplePrices && validVariants.length > 0
        ? validVariants[0].price
        : Number(newServicePrice);

      if (editingService) {
        await inventoryService.updateService(editingService.id, {
          name: newServiceName.trim(),
          price: basePrice,
          // Con precio único se envía lista vacía para desactivar las opciones anteriores
          variants: hasMultiplePrices ? validVariants : [],
        });
        notify('Servicio actualizado exitosamente', 'success');
      } else {
        await inventoryService.createService({
          name: newServiceName.trim(),
          price: basePrice,
          variants: validVariants.length > 0 ? validVariants.map(({ name, price }) => ({ name, price })) : undefined,
        });
        notify('Servicio agregado exitosamente', 'success');
      }

      closeServiceModal();
      loadData();
    } catch (err: any) {
      notify('Error: ' + err.message, 'error');
    }
  };

  /* ------------------------ PRODUCTOS / ARTÍCULOS ------------------------ */

  const resetProductForm = () => {
    setEditingProduct(null);
    setNewProductName('');
    setNewProductSalePrice(0);
    setNewProductCostPrice(0);
    setNewProductStock(10);
    setNewProductSku('');
  };

  const openNewProduct = (type: 'salon' | 'article') => {
    resetProductForm();
    setProductType(type);
    setShowProductModal(true);
  };

  const openEditProduct = (prd: ProductItem) => {
    setEditingProduct(prd);
    setProductType(isArticle(prd) ? 'article' : 'salon');
    setNewProductName(prd.name);
    setNewProductSalePrice(Number(prd.sale_price) || 0);
    setNewProductCostPrice(Number(prd.cost_price) || 0);
    setNewProductStock(Number(prd.stock) || 0);
    setNewProductSku(prd.barcode || prd.sku || '');
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    resetProductForm();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    try {
      const cleanCode = newProductSku.trim();
      const isArt = productType === 'article';

      if (editingProduct) {
        const wasArticleCategory = editingProduct.category_id === ARTICLE_CATEGORY_ID;
        const payload: Record<string, unknown> = {
          name: newProductName.trim(),
          sale_price: Number(newProductSalePrice),
          cost_price: Number(newProductCostPrice),
          stock: Number(newProductStock),
        };
        if (cleanCode) {
          payload.barcode = cleanCode;
          payload.sku = cleanCode;
        }
        if (isArt) {
          payload.category_id = ARTICLE_CATEGORY_ID;
          payload.description = 'Artículo de Cafetería y Snacks';
        } else if (wasArticleCategory) {
          payload.category_id = null;
          payload.description = null;
        }
        await inventoryService.updateProduct(editingProduct.id, payload);
        notify(isArt ? 'Artículo actualizado exitosamente' : 'Producto actualizado exitosamente', 'success');
      } else {
        await inventoryService.createProduct({
          name: newProductName.trim(),
          sale_price: Number(newProductSalePrice),
          cost_price: Number(newProductCostPrice),
          stock: Number(newProductStock),
          barcode: cleanCode || undefined,
          sku: cleanCode || undefined,
          category_id: isArt ? ARTICLE_CATEGORY_ID : undefined,
          description: isArt ? 'Artículo de Cafetería y Snacks' : undefined,
        });
        notify(
          isArt
            ? 'Artículo de cafetería agregado exitosamente. Ya está disponible en la sección "Artículos" de Ventas.'
            : 'Producto de salón agregado exitosamente. Ya está disponible en la sección "Productos" de Ventas.',
          'success'
        );
      }

      closeProductModal();
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

  /* ------------------------------ ELIMINAR ------------------------------ */

  const openDelete = (kind: 'service' | 'product', id: string, name: string) => {
    setDeleteTarget({ kind, id, name });
    setDeleteReason('');
    setDeletePassword('');
    setDeleteError('');
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteReason('');
    setDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    const reason = deleteReason.trim();
    if (reason.length < 3) {
      setDeleteError('Indica el motivo de la eliminación.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Ingresa la contraseña de un administrador.');
      return;
    }

    try {
      setDeleting(true);
      setDeleteError('');
      const payload = { reason, password: deletePassword };
      if (deleteTarget.kind === 'service') {
        await inventoryService.deleteService(deleteTarget.id, payload);
      } else {
        await inventoryService.deleteProduct(deleteTarget.id, payload);
      }
      notify(`"${deleteTarget.name}" fue eliminado`, 'success');
      setDeleting(false);
      setDeleteTarget(null);
      setDeleteReason('');
      setDeletePassword('');
      loadData();
    } catch (err: any) {
      setDeleting(false);
      setDeletePassword('');
      setDeleteError(err.message || 'No se pudo eliminar');
    }
  };

  /* ------------------------------ RENDER ------------------------------ */

  const RowActions: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const renderProductsTable = (list: ProductItem[], isArt: boolean) => (
    <table className="w-full text-left text-xs">
      <thead
        className={
          isArt
            ? 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-semibold border-b border-amber-200/60 dark:border-amber-900/40 uppercase tracking-wider text-[11px]'
            : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px]'
        }
      >
        <tr>
          <th className="py-3.5 px-4">{isArt ? 'Artículo de Cafetería / Snack' : 'Producto de Salón'}</th>
          <th className="py-3.5 px-4">Código / SKU</th>
          <th className="py-3.5 px-4">Costo</th>
          <th className="py-3.5 px-4">Precio Venta</th>
          <th className="py-3.5 px-4">Stock Actual</th>
          <th className="py-3.5 px-4 text-right">Ajuste de Stock</th>
          <th className="py-3.5 px-4 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
        {list.length === 0 ? (
          <tr>
            <td colSpan={7} className="py-8 text-center text-slate-400">
              {isArt ? 'No hay artículos de cafetería registrados.' : 'No hay productos de salón registrados.'}
            </td>
          </tr>
        ) : (
          list.map((prd) => {
            const low = prd.stock <= prd.min_stock;
            return (
              <tr
                key={prd.id}
                className={
                  isArt
                    ? 'hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition'
                }
              >
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {isArt ? (
                    <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Package className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                  {prd.name}
                </td>
                <td
                  className={`py-3.5 px-4 font-mono font-bold ${
                    isArt ? 'text-amber-700 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {prd.barcode || prd.sku || '-'}
                </td>
                <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formatCurrency(prd.cost_price)}</td>
                <td
                  className={`py-3.5 px-4 font-bold ${
                    isArt ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'
                  }`}
                >
                  {formatCurrency(prd.sale_price)}
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        low
                          ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                          : isArt
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {prd.stock} unid.
                    </span>
                    {low && (
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
                <td className="py-3.5 px-4 text-right">
                  <RowActions onEdit={() => openEditProduct(prd)} onDelete={() => openDelete('product', prd.id, prd.name)} />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );

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
              onClick={openNewService}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Nuevo Servicio
            </button>
          )}

          {tab === 'products' && (
            <button
              onClick={() => openNewProduct('salon')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          )}

          {tab === 'articles' && (
            <button
              onClick={() => openNewProduct('article')}
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
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No hay servicios registrados.
                    </td>
                  </tr>
                ) : (
                  services.map((srv) => (
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
                      <td className="py-3.5 px-4 text-right">
                        <RowActions onEdit={() => openEditService(srv)} onDelete={() => openDelete('service', srv.id, srv.name)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : tab === 'products' ? (
            renderProductsTable(salonProducts, false)
          ) : (
            renderProductsTable(articleProducts, true)
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR SERVICIO */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveService} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  {editingService ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingService
                    ? 'Modifica el nombre, el precio único o las opciones de precio'
                    : 'Registra el servicio y define su precio único o diferentes opciones'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeServiceModal}
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
                    Múltiples Opciones
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
                      <div key={v.id || idx} className="flex items-center gap-2">
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
                onClick={closeServiceModal}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-sm shadow-indigo-600/20"
              >
                {editingService ? 'Guardar Cambios' : 'Guardar Servicio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO O ARTÍCULO */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {productType === 'article' ? (
                    <>
                      <Coffee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      {editingProduct ? 'Editar Artículo' : 'Agregar Artículo (Cafetería / Dulces)'}
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      {editingProduct ? 'Editar Producto de Salón' : 'Agregar Producto de Salón'}
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingProduct
                    ? 'Los cambios se reflejan de inmediato en el Punto de Venta'
                    : productType === 'article'
                    ? 'Se enviará directamente al menú "Artículos" en el Punto de Venta'
                    : 'Se enviará directamente al menú "Productos Salón" en el Punto de Venta'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProductModal}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
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
                  <label className="text-slate-700 dark:text-slate-400 block mb-1 font-semibold">
                    {editingProduct ? 'Stock Actual' : 'Stock Inicial'}
                  </label>
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
              {!editingProduct && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  * Si no ingresas un código de barras o SKU, el sistema asignará automáticamente el número correlativo que empieza en 1.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={closeProductModal}
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
                {editingProduct
                  ? 'Guardar Cambios'
                  : productType === 'article'
                  ? 'Guardar Artículo'
                  : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ELIMINAR (motivo + contraseña de administrador) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDelete} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Eliminar {deleteTarget.kind === 'service' ? 'servicio' : 'producto'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vas a eliminar <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong>. Las ventas anteriores no se modifican.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDelete}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  Motivo de la eliminación *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Producto descontinuado, error al cargarlo, duplicado..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="text-slate-700 dark:text-slate-300 mb-1 font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Contraseña de un administrador *
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="Contraseña de administrador"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {deleteError && (
                <div className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 font-medium">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={deleting || deleteReason.trim().length < 3 || !deletePassword}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl cursor-pointer shadow-sm shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};