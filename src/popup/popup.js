// Initialize Matter.js engine and renderer
const { Engine, Render, World, Bodies, Mouse, MouseConstraint } = Matter;
const engine = Engine.create();
const render = Render.create({
    element: document.getElementById('jar-container'),
    canvas: document.getElementById('jar-canvas'),
    engine: engine,
    options: {
        width: 400,
        height: 400, // Reducir la altura máxima a 400px
        wireframes: false,
        background: '#f0f0f0'
    }
});

// Create the jar boundaries
const jarWalls = [
    Bodies.rectangle(200, 390, 400, 20, { isStatic: true }), // Ajustar la posición del fondo
    Bodies.rectangle(10, 200, 20, 400, { isStatic: true }), // Ajustar la altura de la pared izquierda
    Bodies.rectangle(390, 200, 20, 400, { isStatic: true })  // Ajustar la altura de la pared derecha
];
World.add(engine.world, jarWalls);

// Load stones from storage
let stones = [];
chrome.storage.local.get(['stones'], (result) => {
    stones = result.stones || [];
    stones.forEach(stone => addStoneToWorld(stone));
    updateStoneList();
});

// Add stone to Matter.js world
function addStoneToWorld(stone) {
    const sizeMap = { large: 50, medium: 30, small: 20 };
    const radius = sizeMap[stone.size];
    const body = Bodies.polygon(200, 100, Math.floor(Math.random() * 5) + 3, radius, {
        label: stone.title,
        render: {
            fillStyle: stone.color
        }
    });
    body.customId = stone.id;
    World.add(engine.world, body);
}

// Update stone list in the popup
function updateStoneList() {
    const stoneList = document.getElementById('stone-list');
    stoneList.innerHTML = '';
    stones.forEach(stone => {
        const li = document.createElement('li');
        li.textContent = `${stone.title} (${stone.size})`;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteStone(stone.id);
        li.appendChild(deleteButton);
        stoneList.appendChild(li);
    });
}

// Delete stone
function deleteStone(id) {
    stones = stones.filter(stone => stone.id !== id);
    chrome.storage.local.set({ stones });
    const bodies = engine.world.bodies.filter(body => body.customId !== id);
    World.clear(engine.world);
    World.add(engine.world, [...jarWalls, ...bodies]);
    updateStoneList();
}

// Handle form submission to create a new stone
document.getElementById('stone-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('stone-title').value;
    const size = document.getElementById('stone-size').value;
    const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Random color
    const id = Date.now().toString();
    const newStone = { id, title, size, color };
    stones.push(newStone);
    chrome.storage.local.set({ stones });
    addStoneToWorld(newStone);
    updateStoneList();
    e.target.reset();
});

// Add drag-and-drop functionality
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: {
            visible: false
        }
    }
});
World.add(engine.world, mouseConstraint);

// Replace deprecated Engine.run with Matter.Runner.run
const runner = Matter.Runner.create();
Matter.Runner.run(runner, engine);

Render.run(render);