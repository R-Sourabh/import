<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-menu-button slot="start" />
        <ion-back-button default-href="/unified-inventory" slot="start" />
        <ion-title>{{ exactInventoryType.type === 'atp' ? translate("Exact ATP") : exactInventoryType.type === 'qoh' ? translate("Exact QoH") : translate("Cycle count")  }}</ion-title>
        <ion-buttons slot="end">
          <ion-button size="medium" @click="openHelpModal()">
            <ion-icon slot="icon-only" :icon="informationCircleOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <main>
        <ion-item>
          <ion-label>{{ translate("Inventory") }}</ion-label>
          <ion-label class="ion-text-right ion-padding-end">{{ file.name }}</ion-label>
          <input @change="parse" ref="file" class="ion-hide" type="file" id="inventoryInputFile"/>
          <label for="inventoryInputFile">{{ translate("Upload") }}</label>
        </ion-item>

        <ion-list>
          <ion-list-header>{{ translate("Saved mappings") }}</ion-list-header>
          <div>
            <ion-chip :disabled="!this.content.length" outline="true" @click="addFieldMapping()">
              <ion-icon :icon="addOutline" />
              <ion-label>{{ translate("New mapping") }}</ion-label>
            </ion-chip>
            <ion-chip :disabled="!this.content.length" v-for="(mapping, index) in fieldMappings('RSTINV') ?? []" :key="index" @click="mapFields(mapping, index)" :outline="selectedMappingId != index">
              {{ mapping.name }}
            </ion-chip>
          </div>
        </ion-list>
 
        <ion-list>
          <ion-list-header>{{ translate("Select the column index for the following information in the uploaded CSV.") }}</ion-list-header>
          <ion-item :key="field" v-for="(fieldValues, field) in fields">
            <template v-if="field === 'productIdentification'">
              <ion-select aria-label="identification-type-id" interface="popover" :placeholder = "translate('Select')" v-model="identificationTypeId">
                <ion-select-option :key="goodIdentificationType.goodIdentificationTypeId" :value="goodIdentificationType.goodIdentificationTypeId" v-for="goodIdentificationType in goodIdentificationTypes">{{ goodIdentificationType.description }}</ion-select-option>
              </ion-select>
              <ion-select aria-label="identification-type-value" interface="popover" :disabled="!content.length" :placeholder = "translate('Select')" slot="end" v-model="fieldMapping['productIdentification']">
                <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
              </ion-select>
            </template>
            <template v-else>
              <ion-select :label="translate(fieldValues.label)" interface="popover" :disabled="!content.length" :placeholder = "translate('Select')" v-model="fieldMapping[field]">
                <ion-select-option :key="index" v-for="(prop, index) in fileColumns">{{ prop }}</ion-select-option>
              </ion-select>
            </template>
          </ion-item>
        </ion-list>

        <ion-button :disabled="!this.content.length" color="medium" @click="review" expand="block">
          {{ translate("Review") }}
          <ion-icon slot="end" :icon="arrowForwardOutline" />
        </ion-button>
      </main>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonBackButton, IonButton, IonButtons, IonChip, IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonList, IonListHeader, IonMenuButton, IonSelect, IonSelectOption, IonIcon, modalController } from "@ionic/vue";
import { defineComponent } from "vue";
import { useRouter } from 'vue-router';
import { mapGetters, useStore } from "vuex";
import { showToast } from '@/utils';
import { translate } from "@hotwax/dxp-components";
import { addOutline, arrowForwardOutline, informationCircleOutline } from 'ionicons/icons';
import parseFileMixin from '@/mixins/parseFileMixin';
import CreateMappingModal from "@/components/CreateMappingModal.vue";
import HelpModal from "@/components/HelpModal.vue"

export default defineComponent({
  name: "Inventory",
  components: {
    IonBackButton,
    IonButton, 
    IonButtons,
    IonChip,
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonListHeader,
    IonList
  },
  data() {
    return {
      file: {},
      content: [],
      fieldMapping: {},
      fileColumns: [],
      fields: process.env["VUE_APP_MAPPING_RSTINV"] ? JSON.parse(process.env["VUE_APP_MAPPING_RSTINV"]) : {},
      identificationTypeId: "SKU",
      selectedMappingId: ""
    }
  },
  computed: {
    ...mapGetters({
      fieldMappings: 'user/getFieldMappings',
      goodIdentificationTypes: 'util/getGoodIdentificationTypes',
      exactInventoryType: 'util/getExactInventoryType'
    })
  },
  mixins:[ parseFileMixin ],
  ionViewDidEnter() {
    this.file = {}
    this.content = []
    this.fieldMapping = Object.keys(this.fields).reduce((fieldMapping, field) => {
      fieldMapping[field] = ""
      return fieldMapping;
    }, {})
    this.$refs.file.value = null;

    this.store.dispatch('util/fetchGoodIdentificationTypes');
  },
  methods: {
    mapFields(mapping, mappingId) {
      const fieldMapping = JSON.parse(JSON.stringify(mapping));

      // TODO: Store an object in this.content variable, so everytime when accessing it, we don't need to use 0th index
      const csvFields = Object.keys(this.content[0]);

      const missingFields = Object.values(fieldMapping.value).filter(field => {
        if(!csvFields.includes(field)) return field;
      });

      if(missingFields.length) showToast(translate("Some of the mapping fields are missing in the CSV: ", { missingFields: missingFields.join(", ") }))

      Object.keys(fieldMapping.value).map((key) => {
        if(!csvFields.includes(fieldMapping.value[key])){
          fieldMapping.value[key] = "";
        }
      })
      this.fieldMapping = fieldMapping.value;
      this.selectedMappingId = mappingId;
    },
    async parse(event) {
      const file = event.target.files[0];
      try {
        if (file) {
          this.file = file;
          this.content = await this.parseCsv(this.file);
          this.fileColumns = Object.keys(this.content[0]);
          showToast(translate("File uploaded successfully"));
        } else {
          showToast(translate("No new file upload. Please try again"));
        }
      } catch {
        this.content = []
        showToast(translate("Please upload a valid reset inventory csv to continue"));
      }
    },
    async openHelpModal() {
      const helpModal = await modalController.create({
        component: HelpModal,
      });
      
      return helpModal.present();
    },
    review() {
      const areAllFieldsSelected = Object.values(this.fieldMapping).every(field => field !== "");
      
      if (!areAllFieldsSelected) {
        showToast(translate("Select all the fields to continue"));
        return;
      } 

      const stockItems = this.content.map(item => {
        return {
          identification: item[this.fieldMapping.productIdentification],
          identificationTypeId: this.identificationTypeId,
          quantity: item[this.fieldMapping.quantity],
          facilityId: '',
          externalFacilityId: item[this.fieldMapping.facility],
          locationSeqId: item[this.fieldMapping.locationSeqId]
        }
      })
      this.store.dispatch('stock/processUpdateStockItems', stockItems);
      this.router.push({
        name:'InventoryDetail'
      })
    },
    async addFieldMapping() {
      const createMappingModal = await modalController.create({
        component: CreateMappingModal,
        componentProps: { content: this.content, seletedFieldMapping: this.fieldMapping, mappingType: 'RSTINV'}
      });

      createMappingModal.onDidDismiss().then((result) => {
        if(result.data?.mappingId) {
          this.selectedMappingId = result.data.mappingId
        }
      })

      return createMappingModal.present();
    }
  },
  setup() {
    const router = useRouter();
    const store = useStore();
    return {
      addOutline,
      arrowForwardOutline,
      informationCircleOutline,
      router,
      store,
      translate
    }
  } 
})
</script>

<style scoped>
main {
  max-width: 732px;
  margin: var(--spacer-sm) auto 0; 
}

ion-button{
  margin: var(--spacer-base) var(--spacer-sm);
}

label {
  cursor: pointer;
}
</style>