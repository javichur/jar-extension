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
});

// Updated addStoneToWorld to include labels and delete buttons
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

    // Add label and delete button
    const label = document.createElement('div');
    label.textContent = stone.title;
    label.className = 'stone-label';
    label.style.left = `${body.position.x - radius}px`;
    label.style.top = `${body.position.y - radius - 10}px`;
    document.getElementById('jar-container').appendChild(label);

    const deleteButton = document.createElement('div');
    deleteButton.textContent = 'X';
    deleteButton.className = 'stone-delete';
    deleteButton.style.left = `${body.position.x + radius - 10}px`;
    deleteButton.style.top = `${body.position.y - radius + 50}px`; // Adjust the delete button position to avoid overlapping with the title
    deleteButton.onclick = () => deleteStone(stone.id);
    document.getElementById('jar-container').appendChild(deleteButton);

    body.labelElement = label;
    body.deleteElement = deleteButton;
}

// Updated deleteStone to remove labels and delete buttons
function deleteStone(id) {
    stones = stones.filter(stone => stone.id !== id);
    chrome.storage.local.set({ stones });
    const bodyToRemove = engine.world.bodies.find(body => body.customId === id);

    if (bodyToRemove) {
        // Remove associated elements
        if (bodyToRemove.labelElement) {
            bodyToRemove.labelElement.remove();
        }
        if (bodyToRemove.deleteElement) {
            bodyToRemove.deleteElement.remove();
        }

        // Remove the body from the world
        World.remove(engine.world, bodyToRemove);
    }
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

// Update the position of labels and delete buttons to center them on each stone
Matter.Events.on(engine, 'afterUpdate', () => {
    engine.world.bodies.forEach(body => {
        if (body.labelElement && body.deleteElement) {
            const radius = body.circleRadius || 30; // Default radius if not defined
            
            // Center the label on the stone
            body.labelElement.style.left = `${body.position.x - body.labelElement.offsetWidth / 2}px`;
            body.labelElement.style.top = `${body.position.y - body.labelElement.offsetHeight / 2}px`;

            // Center the delete button horizontally but keep it at the top of the stone
            body.deleteElement.style.left = `${body.position.x - body.deleteElement.offsetWidth / 2}px`;
            body.deleteElement.style.top = `${body.position.y - radius - body.deleteElement.offsetHeight}px`;
        }
    });
});