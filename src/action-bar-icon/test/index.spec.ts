import { mount } from '../../../test/test';
import { ActionBarIcon } from '..';

test('should render default slot correctly', () => {
  const wrapper = mount(ActionBarIcon, {
    slots: {
      default: 'Content',
    },
  });
  expect(wrapper.html()).toMatchSnapshot();
});

test('should render icon slot correctly', () => {
  const wrapper = mount(ActionBarIcon, {
    slots: {
      default: 'Content',
      icon: 'Custom Icon',
    },
  });

  expect(wrapper.html()).toMatchSnapshot();
});

test('should render icon-prefix correctly', () => {
  const wrapper = mount(ActionBarIcon, {
    props: {
      icon: 'success',
      iconPrefix: 'my-icon',
    },
  });

  expect(wrapper.html()).toMatchSnapshot();
});

test('should render icon slot with badge correctly', () => {
  const wrapper = mount(ActionBarIcon, {
    props: {
      badge: '1',
    },
    slots: {
      default: 'Content',
      icon: 'Custom Icon',
    },
  });

  expect(wrapper.html()).toMatchSnapshot();
});

test('should render icon slot with dot correctly', () => {
  const wrapper = mount(ActionBarIcon, {
    props: {
      dot: true,
    },
    slots: {
      default: 'Content',
      icon: 'Custom Icon',
    },
  });

  expect(wrapper.html()).toMatchSnapshot();
});
