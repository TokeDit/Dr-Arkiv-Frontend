const API_BASE = 'https://drarkivapi20260416150148-f7d4bjekc6cedebb.swedencentral-01.azurewebsites.net';

const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    // ── State ────────────────────────────────────────────────────────────────
    const token      = ref(localStorage.getItem('dr_token') || null);
    const records    = ref([]);
    const loading    = ref(false);
    const showForm   = ref(false);
    const loginModal = ref(null); // Bootstrap Modal instance

    const search = ref({ title: '', artist: '' });

    const form = ref({
      id: null, title: '', artist: '', duration: null, publicationYear: null,
    });

    const loginForm = ref({ username: '', password: '' });

    const alert = ref({ visible: false, message: '', type: 'danger' });

    // ── Computed ─────────────────────────────────────────────────────────────
    const isLoggedIn = computed(() => !!token.value);

    const loggedInUser = computed(() => {
      if (!token.value) return '';
      try {
        const payload = JSON.parse(atob(token.value.split('.')[1]));
        // .NET issues the name claim under this long URI key
        return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
            || payload.unique_name
            || payload.sub
            || 'User';
      } catch {
        return 'User';
      }
    });

    const formHeading = computed(() =>
      form.value.id ? 'Edit Music Record' : 'Add Music Record');

    // ── Helpers ───────────────────────────────────────────────────────────────
    function formatDuration(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    function showAlert(message, type = 'danger') {
      alert.value = { visible: true, message, type };
      setTimeout(() => { alert.value.visible = false; }, 4000);
    }

    function setAxiosAuth() {
      axios.defaults.headers.common['Authorization'] =
        token.value ? `Bearer ${token.value}` : '';
    }

    // ── Records ───────────────────────────────────────────────────────────────
    async function loadRecords() {
      loading.value = true;
      try {
        const params = {};
        if (search.value.title)  params.title  = search.value.title;
        if (search.value.artist) params.artist = search.value.artist;
        const { data } = await axios.get(`${API_BASE}/api/musicrecords`, { params });
        records.value = data;
      } catch {
        showAlert('Could not load records. Is the API running?');
      } finally {
        loading.value = false;
      }
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    function openLoginModal() {
      loginForm.value = { username: '', password: '' };
      loginModal.value.show();
    }

    async function login() {
      try {
        const { data } = await axios.post(`${API_BASE}/api/auth/login`, {
          username: loginForm.value.username,
          password: loginForm.value.password,
        });
        token.value = data.token;
        localStorage.setItem('dr_token', token.value);
        setAxiosAuth();
        loginModal.value.hide();
        showAlert(`Welcome, ${loggedInUser.value}!`, 'success');
        loadRecords();
      } catch {
        showAlert('Invalid username or password.');
      }
    }

    function logout() {
      token.value = null;
      localStorage.removeItem('dr_token');
      setAxiosAuth();
      showForm.value = false;
      loadRecords();
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    function openAddForm() {
      form.value = { id: null, title: '', artist: '', duration: null, publicationYear: null };
      showForm.value = true;
    }

    function openEditForm(record) {
      form.value = { ...record };
      showForm.value = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelForm() {
      showForm.value = false;
    }

    async function saveRecord() {
      const { id, title, artist, duration, publicationYear } = form.value;
      if (!title || !artist || !duration || !publicationYear) {
        showAlert('Please fill in all fields.');
        return;
      }
      const payload = { title, artist, duration, publicationYear };
      try {
        if (id) {
          await axios.put(`${API_BASE}/api/musicrecords/${id}`, payload);
          showAlert('Record updated.', 'success');
        } else {
          await axios.post(`${API_BASE}/api/musicrecords`, payload);
          showAlert('Record added.', 'success');
        }
        showForm.value = false;
        loadRecords();
      } catch (err) {
        showAlert(err.response?.status === 401 ? 'Not authorised – please login.' : 'Save failed.');
      }
    }

    async function deleteRecord(id) {
      if (!confirm(`Delete record #${id}?`)) return;
      try {
        await axios.delete(`${API_BASE}/api/musicrecords/${id}`);
        showAlert('Record deleted.', 'success');
        loadRecords();
      } catch (err) {
        showAlert(err.response?.status === 401 ? 'Not authorised – please login.' : 'Delete failed.');
      }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    onMounted(() => {
      loginModal.value = new bootstrap.Modal(document.getElementById('loginModal'));
      setAxiosAuth();
      loadRecords();
    });

    return {
      // state
      records, loading, showForm, search, form, loginForm, alert,
      // computed
      isLoggedIn, loggedInUser, formHeading,
      // methods
      formatDuration, loadRecords,
      openLoginModal, login, logout,
      openAddForm, openEditForm, cancelForm, saveRecord, deleteRecord,
    };
  },
}).mount('#app');
