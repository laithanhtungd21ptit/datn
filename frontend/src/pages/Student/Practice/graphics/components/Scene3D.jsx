import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { TransformationType } from '../types';

// Component to draw connections and surfaces between points for all generations
const ConnectionLines = ({ objects, numPoints }) => {
  if (objects.length < 2) return null;
  
  // Group objects by generation
  const generations = [];
  for (let i = 0; i < objects.length; i += numPoints) {
    const generation = objects.slice(i, i + numPoints);
    if (generation.length === numPoints) {
      generations.push(generation);
    }
  }
  
  if (generations.length === 0) return null;
  
  // Helper function to create connections and geometry for a generation
  const createGenerationConnections = (points, generationIndex) => {
    if (points.length < 2) return null;
    
    const lines = [];
    
    // For 4 points: create tetrahedron - connect all pairs of points
    if (points.length === 4) {
      // Connect all 6 edges of tetrahedron: (0,1), (0,2), (0,3), (1,2), (1,3), (2,3)
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          lines.push({
            start: points[i].position,
            end: points[j].position
          });
        }
      }
    } else {
      // For other cases: connect points in order (closed shape)
      for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];
        
        lines.push({
          start: current.position,
          end: next.position
        });
      }
    }
    
    // Create geometry for surfaces
    let surfaceGeometry = null;
    
    if (points.length === 3) {
      // Triangle: create plane
      const vertices = points.map(p => new THREE.Vector3(...p.position));
      surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setFromPoints(vertices);
      surfaceGeometry.setIndex([0, 1, 2]);
      surfaceGeometry.computeVertexNormals();
    } else if (points.length === 4) {
      // Tetrahedron: create 4 triangular faces
      // Faces: (0,1,2), (0,1,3), (0,2,3), (1,2,3)
      const vertices = points.map(p => new THREE.Vector3(...p.position));
      const indices = [
        0, 1, 2,  // Face 1
        0, 1, 3,  // Face 2
        0, 2, 3,  // Face 3
        1, 2, 3   // Face 4
      ];
      
      surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setFromPoints(vertices);
      surfaceGeometry.setIndex(indices);
      surfaceGeometry.computeVertexNormals();
    } else if (points.length >= 5) {
      // Polygon: triangulate using fan method
      const vertices = points.map(p => new THREE.Vector3(...p.position));
      const indices = [];
      for (let i = 1; i < points.length - 1; i++) {
        indices.push(0, i, i + 1);
      }
      
      surfaceGeometry = new THREE.BufferGeometry();
      surfaceGeometry.setFromPoints(vertices);
      surfaceGeometry.setIndex(indices);
      surfaceGeometry.computeVertexNormals();
    }
    
    // Use the color of the first point in this generation (all points have same color)
    const lineColor = points[0].color;
    
    return { lines, surfaceGeometry, lineColor };
  };
  
  // Render connections for all generations
  return (
    <>
      {generations.map((generation, genIdx) => {
        const connections = createGenerationConnections(generation, genIdx);
        if (!connections) return null;
        
        return (
          <React.Fragment key={`generation-${genIdx}`}>
            {/* Draw edges */}
            {connections.lines.map((line, idx) => (
              <Line
                key={`connection-${genIdx}-${idx}`}
                points={[line.start, line.end]}
                color={connections.lineColor}
                lineWidth={2}
                transparent
                opacity={0.6}
              />
            ))}
            
            {/* Draw surfaces */}
            {connections.surfaceGeometry && (
              <mesh key={`surface-${genIdx}`} geometry={connections.surfaceGeometry}>
                <meshStandardMaterial
                  color={connections.lineColor}
                  transparent
                  opacity={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

const TransformableObject = ({ data }) => {
  const rotationRad = [
    (data.rotation[0] * Math.PI) / 180,
    (data.rotation[1] * Math.PI) / 180,
    (data.rotation[2] * Math.PI) / 180,
  ];

  const axisColors = {
    x: "#ef4444",
    y: "#22c55e",
    z: "#3b82f6"
  };

  return (
    <group position={data.position}>
      {/* Object as a point (sphere) - represents a point in 3D space */}
      {/* Note: Rotation and scale are still applied for visualization, but mathematically this is a point */}
      <group rotation={rotationRad} scale={data.scale}>
        <mesh>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={data.color} transparent opacity={0.9} />
        </mesh>
      </group>
      
      {/* Projection lines to axes (drawn relative to object center) */}
      <group>
        {/* Line to X axis (x, 0, 0) */}
        <Line 
          points={[[0, 0, 0], [0, -data.position[1], -data.position[2]]]} 
          color={axisColors.x} 
          lineWidth={1} 
          dashed 
          dashSize={0.2} 
          gapSize={0.1}
          transparent
          opacity={0.4}
        />
        {/* Line to Y axis (0, y, 0) */}
        <Line 
          points={[[0, 0, 0], [-data.position[0], 0, -data.position[2]]]} 
          color={axisColors.y} 
          lineWidth={1} 
          dashed 
          dashSize={0.2} 
          gapSize={0.1}
          transparent
          opacity={0.4}
        />
        {/* Line to Z axis (0, 0, z) */}
        <Line 
          points={[[0, 0, 0], [-data.position[0], -data.position[1], 0]]} 
          color={axisColors.z} 
          lineWidth={1} 
          dashed 
          dashSize={0.2} 
          gapSize={0.1}
          transparent
          opacity={0.4}
        />
      </group>

      {/* Label and Coordinates combined for clarity */}
      <group position={[0, 0.4, 0]}>
        <Text
          fontSize={0.25}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
          font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
        >
          {data.label}
        </Text>
        
        {/* Color-coded parts for (X, Y, Z) */}
        <group position={[0, -0.3, 0]}>
          <Text fontSize={0.18} color="white" position={[-0.6, 0, 0]} anchorX="left">(</Text>
          <Text fontSize={0.18} color={axisColors.x} position={[-0.5, 0, 0]} anchorX="left">{data.position[0].toFixed(1)}</Text>
          <Text fontSize={0.18} color="white" position={[-0.1, 0, 0]} anchorX="left">,</Text>
          <Text fontSize={0.18} color={axisColors.y} position={[0.05, 0, 0]} anchorX="left">{data.position[1].toFixed(1)}</Text>
          <Text fontSize={0.18} color="white" position={[0.45, 0, 0]} anchorX="left">,</Text>
          <Text fontSize={0.18} color={axisColors.z} position={[0.6, 0, 0]} anchorX="left">{data.position[2].toFixed(1)}</Text>
          <Text fontSize={0.18} color="white" position={[1.0, 0, 0]} anchorX="left">)</Text>
        </group>
      </group>
    </group>
  );
};

const DynamicAxes = ({ objects }) => {
  const maxCoord = useMemo(() => {
    let max = 15; // Minimum axis length
    objects.forEach(obj => {
      max = Math.max(max, Math.abs(obj.position[0]) + 2, Math.abs(obj.position[1]) + 2, Math.abs(obj.position[2]) + 2);
    });
    return Math.ceil(max / 2) * 2; // Snap to even numbers
  }, [objects]);

  const range = useMemo(() => {
    const ticks = [];
    for (let i = -maxCoord; i <= maxCoord; i += 2) {
      if (i !== 0) ticks.push(i);
    }
    return ticks;
  }, [maxCoord]);

  const colors = {
    x: "#ef4444", // Red
    y: "#22c55e", // Green
    z: "#3b82f6"  // Blue
  };

  return (
    <group>
      {/* X Axis */}
      <Line points={[[-maxCoord - 1, 0, 0], [maxCoord + 1, 0, 0]]} color={colors.x} lineWidth={2} />
      {range.map(v => (
        <group key={`x-${v}`} position={[v, 0, 0]}>
          <Line points={[[0, -0.15, 0], [0, 0.15, 0]]} color={colors.x} lineWidth={1} />
          <Text position={[0, -0.5, 0]} fontSize={0.25} color={colors.x} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">{v}</Text>
        </group>
      ))}
      <Text position={[maxCoord + 1.8, 0, 0]} fontSize={0.6} color={colors.x} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">X</Text>
      
      {/* Y Axis */}
      <Line points={[[0, -maxCoord - 1, 0], [0, maxCoord + 1, 0]]} color={colors.y} lineWidth={2} />
      {range.map(v => (
        <group key={`y-${v}`} position={[0, v, 0]}>
          <Line points={[[-0.15, 0, 0], [0.15, 0, 0]]} color={colors.y} lineWidth={1} />
          <Text position={[-0.6, 0, 0]} fontSize={0.25} color={colors.y} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">{v}</Text>
        </group>
      ))}
      <Text position={[0, maxCoord + 1.8, 0]} fontSize={0.6} color={colors.y} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">Y</Text>
      
      {/* Z Axis */}
      <Line points={[[0, 0, -maxCoord - 1], [0, 0, maxCoord + 1]]} color={colors.z} lineWidth={2} />
      {range.map(v => (
        <group key={`z-${v}`} position={[0, 0, v]}>
          <Line points={[[-0.15, 0, 0], [0.15, 0, 0]]} color={colors.z} lineWidth={1} />
          <Text position={[-0.5, 0.3, 0]} fontSize={0.25} color={colors.z} rotation={[0, Math.PI / 4, 0]} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">{v}</Text>
        </group>
      ))}
      <Text position={[0, 0, maxCoord + 1.8]} fontSize={0.6} color={colors.z} font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">Z</Text>

      {/* Origin */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <Text position={[-0.5, -0.5, 0]} fontSize={0.35} color="white" font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff">O(0,0,0)</Text>
    </group>
  );
};

const Scene3D = ({ objects, numPoints }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: '#09090b',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 6,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Canvas camera={{ position: [15, 15, 15], fov: 45 }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.7} />
        <pointLight position={[20, 20, 20]} intensity={1.5} />
        <pointLight position={[-20, -20, -20]} intensity={0.5} />
        
        <DynamicAxes objects={objects} />
        
        {/* Draw connections between points */}
        <ConnectionLines objects={objects} numPoints={numPoints} />
        
        {objects.map((obj) => (
          <TransformableObject key={obj.id} data={obj} />
        ))}

        <OrbitControls makeDefault minDistance={2} maxDistance={100} />
      </Canvas>
    </Box>
  );
};

export default Scene3D;

