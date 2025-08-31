// Selecionando elementos
const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const cartItemsContainer = document.getElementById('cart-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const addressInput = document.getElementById('address');
const addressWarn = document.getElementById('address-warn');
const deliveryRadios = document.querySelectorAll('input[name="delivery-type"]');
const addressContainer = document.getElementById('address-container');
const checkoutBtn = document.getElementById('checkout-btn');
const checkoutText = document.getElementById('checkout-text');
const checkoutSpinner = document.getElementById('checkout-spinner');
const closeModalBtn = document.getElementById('close-modal-btn');

let cart = [];


let visitorId = localStorage.getItem('visitorId');
if (!visitorId) {
  visitorId = crypto.randomUUID();
  localStorage.setItem('visitorId', visitorId);
}

function updateCart() {
  cartItemsContainer.innerHTML = '';

  cart.forEach((item, index) => {
    const div = document.createElement('div');
    div.classList.add('flex', 'items-center', 'justify-between', 'border-b', 'py-2');

    div.innerHTML = `
      <div>
        <p>${item.name} <span class="text-sm text-gray-500">× ${item.quantity}</span></p>
      </div>
      <div class="flex items-center gap-4">
        <p class="font-semibold">R$ ${(item.price * item.quantity).toFixed(2)}</p>
        <button class="text-red-500 hover:text-red-700 font-bold" data-index="${index}">x</button>
      </div>
    `;

    cartItemsContainer.appendChild(div);
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = total.toFixed(2);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;

  const removeBtns = cartItemsContainer.querySelectorAll('button');
  removeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = btn.getAttribute('data-index');
      cart.splice(index, 1);
      updateCart();
    });
  });
}

addToCartBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.getAttribute('data-name');
    const price = parseFloat(btn.getAttribute('data-price'));

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    updateCart();
  });
});

cartBtn.addEventListener('click', () => cartModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => cartModal.classList.add('hidden'));


deliveryRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'entrega') {
      addressContainer.style.display = 'block';
    } else {
      addressContainer.style.display = 'none';
      addressWarn.classList.add('hidden');
    }
  });
});

checkoutBtn.addEventListener('click', async () => {
  const deliveryType = document.querySelector('input[name="delivery-type"]:checked')?.value;

  if (!deliveryType) {
    alert('Escolha entrega ou retirada!');
    return;
  }

  if (deliveryType === 'entrega' && addressInput.value.trim() === '') {
    addressWarn.classList.remove('hidden');
    return;
  } else {
    addressWarn.classList.add('hidden');
  }

  if (cart.length === 0) {
    alert('Adicione pelo menos um item ao carrinho');
    return;
  }

  const orderData = {
    visitorId,
    cartItems: cart,
    address: deliveryType === 'entrega' ? addressInput.value.trim() : null
  };

  checkoutBtn.disabled = true;
  closeModalBtn.disabled = true;
  checkoutText.textContent = "Enviando...";
  checkoutSpinner.classList.remove('hidden');

  try {
    const response = await fetch('https://cardapiobackendunivesp.onrender.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (result.success) {
      alert('Pedido enviado com sucesso! O seu pedido tem o ID: ' + result.id);
      cart = [];
      updateCart();
      cartModal.classList.add('hidden');
      addressInput.value = '';
    } else {
      alert(result.message || 'Você já realizou um pedido anteriormente!');
    }
  } catch (err) {
    console.error(err);
    alert('Erro na conexão com o servidor!');
  } finally {
    // Reabilitar botões + esconder spinner
    checkoutBtn.disabled = false;
    closeModalBtn.disabled = false;
    checkoutText.textContent = "Finalizar pedido";
    checkoutSpinner.classList.add('hidden');
  }
});
