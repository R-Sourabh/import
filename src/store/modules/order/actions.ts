import { ActionTree } from 'vuex'
import store from '@/store'
import RootState from '@/store/RootState'
import OrderState from './OrderState'
import * as types from './mutation-types'


const actions: ActionTree<OrderState, RootState> = {
  async fetchOrderDetails ({commit, rootGetters}, items) {
    const productIds = items.filter((item: any) => item.identification).map((item: any) => {
      return item.identification
    })
    const viewSize = productIds.length;
    const viewIndex = 0;
    const payload = {
      viewSize,
      viewIndex,
      productIds,
      identificationTypeId: items[0]?.identificationTypeId
    }
    await store.dispatch("product/fetchProducts", payload);
    const unidentifiedItems = [] as any;

    items = items.filter((item: any) => item.identification).map((item: any) => {
      const product = rootGetters['product/getProduct'](item.identification)

      if (Object.keys(product).length > 0) {
        item.parentProductId = product?.parent?.id;
        item.pseudoId = product.pseudoId;
        item.parentProductName = product?.parent?.productName;
        item.imageUrl = product.images?.mainImageUrl;
        item.isNewProduct = "N";
        item.isSelected = true;
        return item;
      }
      unidentifiedItems.push(item);
      return ;
    }).filter((item: any) => item);
    
    const parsed = items.reduce((itemsByPoId: any, item: any) => {
      itemsByPoId[item.orderId] ? itemsByPoId[item.orderId].push(item) : itemsByPoId[item.orderId] = [item] 
      return itemsByPoId;
    }, {});

    const original = JSON.parse(JSON.stringify(parsed));
    
    commit(types.ORDER_PURCHASEORDERS_UPDATED, {parsed, original, unidentifiedItems});
  },
  updatePurchaseOrders({ commit }, purchaseOrders){
    commit(types.ORDER_PURCHASEORDERS_UPDATED, purchaseOrders)
  },
  updateFileName({ commit }, fileName){
    commit(types.ORDER_FILE_NAME_UPDATED, fileName)
  },
  updateUnidentifiedItem({ commit, state }, payload: any) {
    const parsed = state.purchaseOrders.parsed as any;
    let original = state.purchaseOrders.original as any;
    const unidentifiedItems = payload.unidentifiedItems.map((item: any) => {
      if(item.updatedSku) {
        item.initialSKU = item.shopifyProductSKU;
        item.shopifyProductSKU = item.updatedSku;
        parsed[item.orderId] ? parsed[item.orderId].push(item) : parsed[item.orderId] = [item];
        original[item.orderId] ? original[item.orderId].push(item) : original[item.orderId] = [item];
      } else {
        return item;
      }
    }).filter((item: any) => item);
    original = JSON.parse(JSON.stringify(state.purchaseOrders.original));

    commit(types.ORDER_PURCHASEORDERS_UPDATED, { parsed, original, unidentifiedItems});
  },
  updateMissingFacilities({state, dispatch}, facilityMapping){
    Object.keys(facilityMapping).map((facilityId: any) => {
      Object.values(state.purchaseOrders.parsed).flat().map((item: any) => {
        if(item.externalFacilityId === facilityId){
          item.externalFacilityId = "";
          item.facilityId = facilityMapping[facilityId];
        }
      })
    })
    this.dispatch('order/updatePurchaseOrders', state.purchaseOrders);
  }
}
export default actions;
