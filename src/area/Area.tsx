/* eslint-disable camelcase */
import {
  ref,
  watch,
  computed,
  reactive,
  nextTick,
  PropType,
  onMounted,
  defineComponent,
} from 'vue';

// Utils
import { deepClone } from '../utils/deep-clone';
import { pick, createNamespace, ComponentInstance, extend } from '../utils';
import { pickerProps } from '../picker/Picker';

// Composables
import { useExpose } from '../composables/use-expose';

// Components
import { Picker } from '../picker';

const [name, bem] = createNamespace('area');

const EMPTY_CODE = '000000';

function isOverseaCode(code: string) {
  return code[0] === '9';
}

export type AreaList = {
  city_list: Record<string, string>;
  county_list: Record<string, string>;
  province_list: Record<string, string>;
};

export type AreaColumnOption = {
  name: string;
  code: string;
};

type ColumnType = 'province' | 'county' | 'city';

export default defineComponent({
  name,

  props: extend({}, pickerProps, {
    value: String,
    areaList: {
      type: Object as PropType<AreaList>,
      default: () => ({}),
    },
    columnsNum: {
      type: [Number, String],
      default: 3,
    },
    isOverseaCode: {
      type: Function as PropType<(code: string) => boolean>,
      default: isOverseaCode,
    },
    columnsPlaceholder: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
  }),

  emits: ['change', 'confirm'],

  setup(props, { emit, slots }) {
    const pickerRef = ref<ComponentInstance>();

    const state = reactive({
      code: props.value,
      columns: [{ values: [] }, { values: [] }, { values: [] }],
    });

    const areaList = computed(() => {
      const { areaList } = props;
      return {
        province: areaList.province_list || {},
        city: areaList.city_list || {},
        county: areaList.county_list || {},
      };
    });

    const placeholderMap = computed(() => {
      const { columnsPlaceholder } = props;
      return {
        province: columnsPlaceholder[0] || '',
        city: columnsPlaceholder[1] || '',
        county: columnsPlaceholder[2] || '',
      };
    });

    const getDefaultCode = () => {
      if (props.columnsPlaceholder.length) {
        return EMPTY_CODE;
      }

      const { county, city } = areaList.value;

      const countyCodes = Object.keys(county);
      if (countyCodes[0]) {
        return countyCodes[0];
      }

      const cityCodes = Object.keys(city);
      if (cityCodes[0]) {
        return cityCodes[0];
      }

      return '';
    };

    const getColumnValues = (type: ColumnType, code?: string) => {
      let column: AreaColumnOption[] = [];
      if (type !== 'province' && !code) {
        return column;
      }

      const list = areaList.value[type];
      column = Object.keys(list).map((listCode) => ({
        code: listCode,
        name: list[listCode],
      }));

      if (code) {
        // oversea code
        if (type === 'city' && props.isOverseaCode(code)) {
          code = '9';
        }
        column = column.filter((item) => item.code.indexOf(code!) === 0);
      }

      if (placeholderMap.value[type] && column.length) {
        // set columns placeholder
        let codeFill = '';
        if (type === 'city') {
          codeFill = EMPTY_CODE.slice(2, 4);
        } else if (type === 'county') {
          codeFill = EMPTY_CODE.slice(4, 6);
        }

        column.unshift({
          code: code + codeFill,
          name: placeholderMap.value[type],
        });
      }

      return column;
    };

    // get index by code
    const getIndex = (type: ColumnType, code: string) => {
      let compareNum = code.length;
      if (type === 'province') {
        compareNum = props.isOverseaCode(code) ? 1 : 2;
      }
      if (type === 'city') {
        compareNum = 4;
      }

      code = code.slice(0, compareNum);

      const list = getColumnValues(
        type,
        compareNum > 2 ? code.slice(0, compareNum - 2) : ''
      );

      for (let i = 0; i < list.length; i++) {
        if (list[i].code.slice(0, compareNum) === code) {
          return i;
        }
      }

      return 0;
    };

    const setValues = () => {
      let code = state.code || getDefaultCode();
      const picker = pickerRef.value;
      const province = getColumnValues('province');
      const city = getColumnValues('city', code.slice(0, 2));

      if (!picker) {
        return;
      }

      picker.setColumnValues(0, province);
      picker.setColumnValues(1, city);

      if (
        city.length &&
        code.slice(2, 4) === '00' &&
        !props.isOverseaCode(code)
      ) {
        [{ code }] = city;
      }

      picker.setColumnValues(2, getColumnValues('county', code.slice(0, 4)));
      picker.setIndexes([
        getIndex('province', code),
        getIndex('city', code),
        getIndex('county', code),
      ]);
    };

    // parse output columns data
    const parseValues = (values: AreaColumnOption[]) => {
      return values.map((value, index) => {
        if (value) {
          value = deepClone(value);

          if (!value.code || value.name === props.columnsPlaceholder[index]) {
            value.code = '';
            value.name = '';
          }
        }

        return value;
      });
    };

    const getValues = () => {
      if (pickerRef.value) {
        const values = pickerRef.value.getValues().filter(Boolean);
        return parseValues(values);
      }
      return [];
    };

    const getArea = () => {
      const values = getValues();
      const area = {
        code: '',
        country: '',
        province: '',
        city: '',
        county: '',
      };

      if (!values.length) {
        return area;
      }

      const names = values.map((item) => item.name);
      const validValues = values.filter((value) => value.code);

      area.code = validValues.length
        ? validValues[validValues.length - 1].code
        : '';

      if (props.isOverseaCode(area.code)) {
        area.country = names[1] || '';
        area.province = names[2] || '';
      } else {
        area.province = names[0] || '';
        area.city = names[1] || '';
        area.county = names[2] || '';
      }

      return area;
    };

    const reset = (newCode = '') => {
      state.code = newCode;
      setValues();
    };

    const onChange = (values: AreaColumnOption[], index: number) => {
      state.code = values[index].code;
      setValues();

      const parsedValues = parseValues(pickerRef.value!.getValues());
      emit('change', parsedValues, index);
    };

    const onConfirm = (values: AreaColumnOption[], index: number) => {
      setValues();
      emit('confirm', parseValues(values), index);
    };

    onMounted(setValues);

    watch(
      () => props.value,
      (value) => {
        state.code = value;
        setValues();
      }
    );

    watch(() => props.areaList, setValues, { deep: true });

    watch(
      () => props.columnsNum,
      () => nextTick(setValues)
    );

    useExpose({ reset, getArea, getValues });

    return () => {
      const columns = state.columns.slice(0, +props.columnsNum);

      return (
        <Picker
          v-slots={pick(slots, ['title', 'columns-top', 'columns-bottom'])}
          ref={pickerRef}
          class={bem()}
          columns={columns}
          valueKey="name"
          onChange={onChange}
          onConfirm={onConfirm}
          {...pick(props, [
            'title',
            'loading',
            'readonly',
            'itemHeight',
            'swipeDuration',
            'visibleItemCount',
            'cancelButtonText',
            'confirmButtonText',
          ])}
        />
      );
    };
  },
});
