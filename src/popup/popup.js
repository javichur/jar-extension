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
        wireframes: false
    }
});

// Cambiar las paredes negras a transparentes
const jarWalls = [
    Bodies.rectangle(200, 390, 400, 20, { isStatic: true, render: { fillStyle: 'transparent' } }), // Fondo transparente
    Bodies.rectangle(10, 200, 50, 400, { isStatic: true, render: { fillStyle: 'transparent' } }), // Pared izquierda transparente
    Bodies.rectangle(380, 200, 40, 420, { isStatic: true, render: { fillStyle: 'transparent' } })  // Pared derecha transparente
];
World.add(engine.world, jarWalls);

// Detect if running inside a Chrome extension
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage;

// Import LZ-String for compression and decompression
// Ensure to include lz-string library in your project

// Compress stones data for shorter URLs
function compressStones(stones) {
    return LZString.compressToEncodedURIComponent(JSON.stringify(stones));
}

// Decompress stones data from URL
function decompressStones(compressedStones) {
    return JSON.parse(LZString.decompressFromEncodedURIComponent(compressedStones));
}

// Load stones from storage or URL query params
let stones = [];
if (isChromeExtension) {
    chrome.storage.local.get(['stones'], (result) => {
        stones = result.stones || [];
        stones.forEach(stone => addStoneToWorld(stone));
    });
} else {
    const urlParams = new URLSearchParams(window.location.search);
    const stonesParam = urlParams.get('stones');
    stones = stonesParam ? decompressStones(stonesParam) : [];
    stones.forEach(stone => addStoneToWorld(stone));
}

// Updated function to update URL with compressed stones
function updateURLWithStones() {
    if (!isChromeExtension) {
        const urlParams = new URLSearchParams();
        urlParams.set('stones', compressStones(stones));
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState(null, '', newUrl);
    }
}

// Helper function to generate random vertices for irregular shapes
function generateRandomVertices(radius, vertexCount) {
    const vertices = [];
    for (let i = 0; i < vertexCount; i++) {
        const angle = (Math.PI * 2 * i) / vertexCount;
        const randomOffset = Math.random() * 0.3 + 0.7; // Randomize radius between 70% and 100%
        const x = Math.cos(angle) * radius * randomOffset;
        const y = Math.sin(angle) * radius * randomOffset;
        vertices.push({ x, y });
    }
    return vertices;
}

// Generate a valid 6-character hexadecimal color
function generateRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

// Updated addStoneToWorld to include labels and delete buttons
function addStoneToWorld(stone) {
    // Duplicar el tamaño de las piedras
    const sizeMap = { large: 80, medium: 40, small: 20 };
    const radius = sizeMap[stone.size];
    const vertexCount = Math.floor(Math.random() * 5) + 5; // Randomize vertex count between 5 and 9
    const vertices = generateRandomVertices(radius, vertexCount);

    const body = Bodies.fromVertices(200, 100, [vertices], {
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

    // Update URL if not in Chrome extension
    updateURLWithStones();
}

// Updated deleteStone to remove labels and delete buttons
function deleteStone(id) {
    stones = stones.filter(stone => stone.id !== id);

    if (isChromeExtension) {
        chrome.storage.local.set({ stones });
    } else {
        updateURLWithStones();
    }

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

// Updated form submission handler to use the new color generator
document.getElementById('stone-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('stone-title').value;
    const size = document.getElementById('stone-size').value;
    const color = generateRandomColor(); // Use the new color generator
    const id = Date.now().toString();
    const newStone = { id, title, size, color };
    stones.push(newStone);

    if (isChromeExtension) {
        chrome.storage.local.set({ stones });
    } else {
        updateURLWithStones();
    }

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

// Eliminar explícitamente el fondo del canvas después de Render.run()
const canvasElement = document.getElementById('jar-canvas');
if (canvasElement) {
    canvasElement.style.background = 'none';
}

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