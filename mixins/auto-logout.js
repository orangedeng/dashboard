import { SETTING } from '@/config/settings';
import { MANAGEMENT } from '@/config/types';
import throttle from 'lodash/throttle';

const defaultEvents = ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel'];

export default {
  async fetch() {
    const uiSessionLogoutMinutes = await this.$store.getters['management/byId'](MANAGEMENT.SETTING, SETTING.UI_SESSION_LOGOUT_MINUTES);

    this.uiSessionLogoutMinutes = uiSessionLogoutMinutes?.value ?? 30;
  },

  data() {
    return {
      lastActive:             new Date().getTime(),
      autoLogoutTimer:        null,
      uiSessionLogoutMinutes: 30,
    };
  },

  computed: {
    uiSessionTimeout() {
      return parseInt(this.uiSessionLogoutMinutes, 10) * 1000 * 60;
    }
  },

  methods: {
    $_checkTimeout() {
      const now = new Date().getTime();

      if (now - this.lastActive < this.uiSessionTimeout) {
        return;
      }

      this.$store.dispatch('growl/warning', {
        title:   this.t('autoLogout.title'),
        message: this.t('autoLogout.message', { autoLogoutTime: this.uiSessionLogoutMinutes })
      }, { root: true });

      window.setTimeout(() => {
        this.$router.push({ name: 'auth-logout' });
      }, 5000);
    },

    $_init() {
      this.autoLogoutTimer = window.setInterval(() => {
        this.$_checkTimeout();
      }, 60 * 1000);
      const resetLastActive = throttle(() => {
        this.lastActive = new Date().getTime();
      }, 250, { leading: true });

      defaultEvents.forEach((e) => {
        window.document.addEventListener(e, resetLastActive);
      });
      this.$on('hook:beforeDestroy', () => {
        if (this.autoLogoutTimer) {
          window.clearInterval(this.autoLogoutTimer);
        }

        defaultEvents.forEach((e) => {
          window.document.removeEventListener(e, resetLastActive);
        });
      });
    }
  },

  mounted() {
    if ( process.client ) {
      this.$_init();
    }
  },
};