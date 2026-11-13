import { useContext } from 'react'
import ShoppingContext from '../context/shoppingContext.js'

export function useShopping() {
  const context = useContext(ShoppingContext)
  if (!context) throw new Error('useShopping must be used within ShoppingProvider')
  return context
}
