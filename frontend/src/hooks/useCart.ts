import { useApp } from '../context/AppContext';

export const useCart = () => {
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
  } = useApp();

  return {
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
    itemCount: cart.reduce((total, item) => total + item.quantity, 0),
  };
};
