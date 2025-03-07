import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// Constants for standard container sizes in meters
const CONTAINER_SIZES = {
    '20ft': { length: 6.06, width: 2.44, height: 2.59, name: '20ft Standard' },
    '40ft': { length: 12.19, width: 2.44, height: 2.59, name: '40ft Standard' },
    '40ftHC': { length: 12.19, width: 2.44, height: 2.90, name: '40ft High Cube' }
};

// Main application class
class ContainerDesigner {
    constructor() {
        this.containers = [];
        this.selectedContainer = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.transformControls = null;
        this.gridHelper = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.containerIdCounter = 0;
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            (window.innerWidth - 300) / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(10, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth - 300, window.innerHeight);
        document.getElementById('scene-container').appendChild(this.renderer.domElement);
        
        // Add orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        
        // Add transform controls for moving containers
        this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
        this.transformControls.setMode('translate');
        this.transformControls.addEventListener('dragging-changed', (event) => {
            this.controls.enabled = !event.value;
            if (!event.value && this.selectedContainer) {
                this.updatePositionInputs(this.selectedContainer);
                this.checkCollisions();
            }
        });
        this.scene.add(this.transformControls);
        
        // Add grid helper
        this.gridHelper = new THREE.GridHelper(30, 30);
        this.scene.add(this.gridHelper);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupEventListeners() {
        // Container type selection
        document.getElementById('container-type').addEventListener('change', (e) => {
            const showCustom = e.target.value === 'custom';
            document.getElementById('custom-dimensions').classList.toggle('hidden', !showCustom);
            
            if (e.target.value !== 'custom') {
                const size = CONTAINER_SIZES[e.target.value];
                document.getElementById('length').value = size.length;
                document.getElementById('width').value = size.width;
                document.getElementById('height').value = size.height;
            }
        });
        
        // Add container button
        document.getElementById('add-container').addEventListener('click', () => this.addContainer());
        
        // Duplicate container button
        document.getElementById('duplicate-container').addEventListener('click', () => this.duplicateContainer());
        
        // Remove container button
        document.getElementById('remove-container').addEventListener('click', () => this.removeContainer());
        
        // Container selection through click
        this.renderer.domElement.addEventListener('click', (event) => this.onContainerClick(event));
        
        // Camera view buttons
        document.getElementById('view-top').addEventListener('click', () => this.setCameraView('top'));
        document.getElementById('view-front').addEventListener('click', () => this.setCameraView('front'));
        document.getElementById('view-side').addEventListener('click', () => this.setCameraView('side'));
        document.getElementById('view-iso').addEventListener('click', () => this.setCameraView('iso'));
        
        // Toggle grid
        document.getElementById('toggle-grid').addEventListener('click', () => this.toggleGrid());
        
        // Position controls
        document.getElementById('position-x').addEventListener('change', (e) => this.updateContainerPosition('x', e.target.value));
        document.getElementById('position-y').addEventListener('change', (e) => this.updateContainerPosition('y', e.target.value));
        document.getElementById('position-z').addEventListener('change', (e) => this.updateContainerPosition('z', e.target.value));
        document.getElementById('rotation-y').addEventListener('change', (e) => this.updateContainerRotation(e.target.value));
        
        // Design tools
        document.getElementById('stack-containers').addEventListener('click', () => this.autoStackContainers());
        document.getElementById('align-containers').addEventListener('click', () => this.autoAlignContainers());
        document.getElementById('check-collisions').addEventListener('click', () => this.checkCollisions(true));
        document.getElementById('generate-report').addEventListener('click', () => this.generateReport());
        
        // Modal close button
        document.querySelector('.close-button').addEventListener('click', () => {
            document.getElementById('modal').classList.add('hidden');
        });
    }
    
    addContainer() {
        const containerType = document.getElementById('container-type').value;
        let length, width, height, name;
        
        if (containerType === 'custom') {
            length = parseFloat(document.getElementById('length').value);
            width = parseFloat(document.getElementById('width').value);
            height = parseFloat(document.getElementById('height').value);
            name = 'Custom Container';
        } else {
            const size = CONTAINER_SIZES[containerType];
            length = size.length;
            width = size.width;
            height = size.height;
            name = size.name;
        }
        
        const color = document.getElementById('container-color').value;
        
        // Create container geometry and material
        const geometry = new THREE.BoxGeometry(length, height, width);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            metalness: 0.2,
            roughness: 0.7
        });
        
        // Create mesh
        const container = new THREE.Mesh(geometry, material);
        container.position.y = height / 2; // Place container on ground
        
        // Add container details
        container.userData = {
            id: ++this.containerIdCounter,
            type: containerType === 'custom' ? 'custom' : containerType,
            name: name,
            dimensions: {
                length: length,
                width: width,
                height: height
            },
            color: color
        };
        
        // Add container to scene and array
        this.scene.add(container);
        this.containers.push(container);
        
        // Select new container
        this.selectContainer(container);
        
        // Check for collisions
        this.checkCollisions();
        
        this.updateContainerPreview();
        
        return container;
    }
    
    duplicateContainer() {
        if (!this.selectedContainer) return;
        
        const original = this.selectedContainer;
        const color = original.material.color.getHexString();
        
        // Set form values to match the selected container
        document.getElementById('container-type').value = original.userData.type;
        document.getElementById('container-color').value = `#${color}`;
        
        if (original.userData.type === 'custom') {
            document.getElementById('custom-dimensions').classList.remove('hidden');
            document.getElementById('length').value = original.userData.dimensions.length;
            document.getElementById('width').value = original.userData.dimensions.width;
            document.getElementById('height').value = original.userData.dimensions.height;
        }
        
        // Create duplicate container
        const duplicate = this.addContainer();
        
        // Position duplicate next to the original
        duplicate.position.copy(original.position);
        duplicate.position.x += original.userData.dimensions.length + 0.5;
        duplicate.rotation.y = original.rotation.y;
        
        // Update position inputs
        this.updatePositionInputs(duplicate);
        
        // Check for collisions
        this.checkCollisions();
    }
    
    removeContainer() {
        if (!this.selectedContainer) return;
        
        // Remove from scene and array
        this.scene.remove(this.selectedContainer);
        this.containers = this.containers.filter(c => c !== this.selectedContainer);
        
        // Detach transform controls
        this.transformControls.detach();
        
        // Update UI
        this.selectedContainer = null;
        document.getElementById('selected-container-info').innerHTML = '<p>No container selected</p>';
        document.getElementById('position-controls').classList.add('hidden');
        
        this.updateContainerPreview();
    }
    
    selectContainer(container) {
        // Deselect previously selected container
        if (this.selectedContainer) {
            if (this.selectedContainer.material.emissive) {
                this.selectedContainer.material.emissive.set(0x000000);
            }
        }
        
        // Select new container
        this.selectedContainer = container;
        
        if (container) {
            // Highlight selected container
            container.material.emissive = new THREE.Color(0x333333);
            
            // Attach transform controls
            this.transformControls.attach(container);
            
            // Update UI
            const info = `
                <p><strong>ID:</strong> ${container.userData.id}</p>
                <p><strong>Type:</strong> ${container.userData.name}</p>
                <p><strong>Dimensions:</strong> ${container.userData.dimensions.length.toFixed(2)}m × 
                ${container.userData.dimensions.width.toFixed(2)}m × 
                ${container.userData.dimensions.height.toFixed(2)}m</p>
                <p><strong>Volume:</strong> ${(container.userData.dimensions.length * 
                                             container.userData.dimensions.width * 
                                             container.userData.dimensions.height).toFixed(2)} m³</p>
            `;
            document.getElementById('selected-container-info').innerHTML = info;
            document.getElementById('position-controls').classList.remove('hidden');
            
            // Update position inputs
            this.updatePositionInputs(container);
        } else {
            // Update UI for no selection
            document.getElementById('selected-container-info').innerHTML = '<p>No container selected</p>';
            document.getElementById('position-controls').classList.add('hidden');
            this.transformControls.detach();
        }
        
        this.updateContainerPreview();
    }
    
    updatePositionInputs(container) {
        document.getElementById('position-x').value = container.position.x.toFixed(2);
        document.getElementById('position-y').value = container.position.y.toFixed(2);
        document.getElementById('position-z').value = container.position.z.toFixed(2);
        
        // Convert rotation from radians to degrees, normalized to 0-270
        const degrees = THREE.MathUtils.radToDeg(container.rotation.y) % 360;
        const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
        const snappedDegrees = Math.round(normalizedDegrees / 90) * 90;
        document.getElementById('rotation-y').value = snappedDegrees;
    }
    
    updateContainerPosition(axis, value) {
        if (!this.selectedContainer) return;
        
        const position = parseFloat(value);
        if (isNaN(position)) return;
        
        this.selectedContainer.position[axis] = position;
        this.transformControls.update();
        this.checkCollisions();
    }
    
    updateContainerRotation(value) {
        if (!this.selectedContainer) return;
        
        const rotation = parseFloat(value);
        if (isNaN(rotation)) return;
        
        this.selectedContainer.rotation.y = THREE.MathUtils.degToRad(rotation);
        this.transformControls.update();
        this.checkCollisions();
    }
    
    onContainerClick(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ((event.clientX - 300) / (window.innerWidth - 300)) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Raycast to find intersections
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.containers);
        
        if (intersects.length > 0) {
            this.selectContainer(intersects[0].object);
        } else {
            this.selectContainer(null);
        }
    }
    
    setCameraView(viewType) {
        const distance = 20;
        
        switch (viewType) {
            case 'top':
                this.camera.position.set(0, distance, 0.0001); // Small Z offset to avoid gimbal lock
                break;
            case 'front':
                this.camera.position.set(0, 0, distance);
                break;
            case 'side':
                this.camera.position.set(distance, 0, 0);
                break;
            case 'iso':
                this.camera.position.set(distance, distance, distance);
                break;
        }
        
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }
    
    toggleGrid() {
        this.gridHelper.visible = !this.gridHelper.visible;
    }
    
    onWindowResize() {
        this.camera.aspect = (window.innerWidth - 300) / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth - 300, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    checkCollisions(showAlert = false) {
        let collisions = [];
        
        // Check each container against every other container
        for (let i = 0; i < this.containers.length; i++) {
            const containerA = this.containers[i];
            const boxA = new THREE.Box3().setFromObject(containerA);
            
            // Reset material
            containerA.material.color.set(containerA.userData.color);
            
            for (let j = i + 1; j < this.containers.length; j++) {
                const containerB = this.containers[j];
                const boxB = new THREE.Box3().setFromObject(containerB);
                
                if (boxA.intersectsBox(boxB)) {
                    collisions.push({
                        containerA: containerA.userData,
                        containerB: containerB.userData
                    });
                    
                    // Highlight colliding containers
                    containerA.material.color.set(0xff0000);
                    containerB.material.color.set(0xff0000);
                }
            }
        }
        
        if (showAlert && collisions.length > 0) {
            this.showModal('Collision Detected', `
                <p>Found ${collisions.length} collision(s) between containers:</p>
                <ul>
                    ${collisions.map(c => `<li>Container #${c.containerA.id} collides with Container #${c.containerB.id}</li>`).join('')}
                </ul>
                <p>Colliding containers are highlighted in red.</p>
            `);
        } else if (showAlert) {
            this.showModal('No Collisions', '<p>No collisions detected between containers.</p>');
        }
        
        return collisions;
    }
    
    autoStackContainers() {
        if (this.containers.length < 2) {
            this.showModal('Auto Stack', '<p>Need at least 2 containers to perform stacking.</p>');
            return;
        }
        
        // Sort containers by position (bottom to top)
        const sortedContainers = [...this.containers].sort((a, b) => {
            return a.position.y - b.position.y;
        });
        
        // Find base containers (those closest to the ground)
        const baseHeight = sortedContainers[0].position.y;
        const baseContainers = sortedContainers.filter(c => 
            Math.abs(c.position.y - baseHeight) < 0.1
        );
        
        // Find containers to stack
        const containersToStack = sortedContainers.filter(c => 
            Math.abs(c.position.y - baseHeight) >= 0.1
        );
        
        if (containersToStack.length === 0) {
            // If all containers are at the same level, move all but first
            for (let i = 1; i < sortedContainers.length; i++) {
                const container = sortedContainers[i];
                const baseContainer = sortedContainers[0];
                
                // Place on top of base container
                container.position.x = baseContainer.position.x;
                container.position.z = baseContainer.position.z;
                container.position.y = baseContainer.position.y + 
                                     baseContainer.userData.dimensions.height +
                                     container.userData.dimensions.height / 2;
                
                // Match rotation
                container.rotation.y = baseContainer.rotation.y;
            }
        } else {
            // Stack containers on top of base containers
            for (let i = 0; i < containersToStack.length; i++) {
                const container = containersToStack[i];
                const baseIndex = i % baseContainers.length;
                const baseContainer = baseContainers[baseIndex];
                
                // Place on top of base container
                container.position.x = baseContainer.position.x;
                container.position.z = baseContainer.position.z;
                container.position.y = baseContainer.position.y + 
                                     baseContainer.userData.dimensions.height / 2 +
                                     container.userData.dimensions.height / 2;
                
                // Match rotation
                container.rotation.y = baseContainer.rotation.y;
            }
        }
        
        // Check for collisions after stacking
        this.checkCollisions(true);
        
        // Update position inputs if a container is selected
        if (this.selectedContainer) {
            this.updatePositionInputs(this.selectedContainer);
        }
    }
    
    autoAlignContainers() {
        if (this.containers.length < 2) {
            this.showModal('Auto Align', '<p>Need at least 2 containers to perform alignment.</p>');
            return;
        }

        // First align all containers to a grid on the ground
        const gridSize = 2.5; // Approximately the width of a container
        const rows = Math.ceil(Math.sqrt(this.containers.length));
        
        for (let i = 0; i < this.containers.length; i++) {
            const container = this.containers[i];
            const row = Math.floor(i / rows);
            const col = i % rows;
            
            // Normalize rotation to 0, 90, 180, or 270 degrees
            const normalizedRotation = Math.round(container.rotation.y / (Math.PI/2)) * (Math.PI/2);
            container.rotation.y = normalizedRotation;
            
            // Get container dimensions
            const { length, height } = container.userData.dimensions;
            
            // Position in a grid layout
            container.position.x = col * (length + gridSize);
            container.position.z = row * (gridSize);
            container.position.y = height / 2; // Place on ground
        }
        
        // Check for collisions after alignment
        this.checkCollisions(true);
        
        // Update position inputs if a container is selected
        if (this.selectedContainer) {
            this.updatePositionInputs(this.selectedContainer);
        }
    }
    
    generateReport() {
        if (this.containers.length === 0) {
            this.showModal('Container Report', '<p>No containers to report on.</p>');
            return;
        }
        
        // Calculate total volume, area, etc.
        let totalVolume = 0;
        let totalFootprint = 0;
        let maxHeight = 0;
        let containersByType = {};
        
        // Create report table
        let tableHtml = `
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Dimensions (m)</th>
                        <th>Volume (m³)</th>
                        <th>Position (m)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.containers.forEach(container => {
            const { id, type, name, dimensions } = container.userData;
            const { length, width, height } = dimensions;
            const volume = length * width * height;
            
            // Add to running totals
            totalVolume += volume;
            totalFootprint += length * width;
            maxHeight = Math.max(maxHeight, container.position.y + height/2);
            
            // Count containers by type
            if (!containersByType[type]) {
                containersByType[type] = 1;
            } else {
                containersByType[type]++;
            }
            
            // Add row to table
            tableHtml += `
                <tr>
                    <td>${id}</td>
                    <td>${name}</td>
                    <td>${length.toFixed(2)} × ${width.toFixed(2)} × ${height.toFixed(2)}</td>
                    <td>${volume.toFixed(2)}</td>
                    <td>(${container.position.x.toFixed(2)}, ${container.position.y.toFixed(2)}, ${container.position.z.toFixed(2)})</td>
                </tr>
            `;
        });
        
        tableHtml += `</tbody></table>`;
        
        // Create summary information
        let typeSummary = '';
        for (const [type, count] of Object.entries(containersByType)) {
            typeSummary += `<li>${count} × ${type === 'custom' ? 'Custom' : CONTAINER_SIZES[type].name}</li>`;
        }
        
        // Create collisions report
        const collisions = this.checkCollisions();
        let collisionReport = '';
        if (collisions.length > 0) {
            collisionReport = `
                <h3 style="color: red;">⚠️ Collisions Detected</h3>
                <p>Found ${collisions.length} collision(s) between containers:</p>
                <ul>
                    ${collisions.map(c => `<li>Container #${c.containerA.id} collides with Container #${c.containerB.id}</li>`).join('')}
                </ul>
            `;
        } else {
            collisionReport = `<h3 style="color: green;">✓ No Collisions Detected</h3>`;
        }
        
        const reportHtml = `
            <div>
                <h3>Summary</h3>
                <p><strong>Total Containers:</strong> ${this.containers.length}</p>
                <p><strong>Container Types:</strong></p>
                <ul>${typeSummary}</ul>
                <p><strong>Total Volume:</strong> ${totalVolume.toFixed(2)} m³</p>
                <p><strong>Total Footprint:</strong> ${totalFootprint.toFixed(2)} m²</p>
                <p><strong>Maximum Height:</strong> ${maxHeight.toFixed(2)} m</p>
                
                ${collisionReport}
                
                <h3>Container Details</h3>
                ${tableHtml}
            </div>
        `;
        
        this.showModal('Container Design Report', reportHtml);
    }
    
    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal').classList.remove('hidden');
    }
    
    updateContainerPreview() {
        const preview = document.getElementById('container-preview');
        if (!preview) return;
        
        // Clear previous content
        preview.innerHTML = '';
        
        if (this.containers.length === 0) {
            preview.innerHTML = '<div style="color: #b0bec5;">No containers added yet</div>';
            return;
        }
        
        // Create a simple SVG representation of the containers
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 100 60');
        
        // Draw a representation of all containers (simple version)
        this.containers.forEach((container, index) => {
            if (index > 4) return; // Show only first 5 containers
            
            const { color } = container.userData;
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', 10 + (index * 15));
            rect.setAttribute('y', 15);
            rect.setAttribute('width', 15);
            rect.setAttribute('height', 30);
            rect.setAttribute('fill', color);
            rect.setAttribute('stroke', '#fff');
            rect.setAttribute('stroke-width', '1');
            
            if (container === this.selectedContainer) {
                rect.setAttribute('stroke', '#ff0');
                rect.setAttribute('stroke-width', '2');
            }
            
            svg.appendChild(rect);
        });
        
        if (this.containers.length > 5) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '85');
            text.setAttribute('y', '35');
            text.setAttribute('fill', '#fff');
            text.setAttribute('font-size', '12');
            text.textContent = '+' + (this.containers.length - 5);
            svg.appendChild(text);
        }
        
        preview.appendChild(svg);
    }

}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ContainerDesigner();
});