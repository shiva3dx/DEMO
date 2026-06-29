export const rooms = {
  entrance: {
    id: 'entrance',
    name: 'Entrance Lobby',
    image: '/assets/panoramas/entrance.png',
    initialYaw: 0,
    initialPitch: 0,
    hotspots: [
      {
        type: 'nav',
        target: 'bedroom',
        yaw: 45, // degrees
        pitch: -5, // degrees
        label: 'Walk to Bedroom'
      },
      {
        type: 'nav',
        target: 'kitchen',
        yaw: -60,
        pitch: -5,
        label: 'Walk to Kitchen'
      },
      {
        type: 'info',
        yaw: 15,
        pitch: 15,
        title: 'Smart Welcomer',
        content: 'Interactive touch screen for smart home controls, guest logging, and security settings.'
      }
    ]
  },
  bedroom: {
    id: 'bedroom',
    name: 'Minimalist Bedroom',
    image: '/assets/panoramas/bedroom.png',
    initialYaw: 180,
    initialPitch: 0,
    hotspots: [
      {
        type: 'nav',
        target: 'entrance',
        yaw: -135,
        pitch: -10,
        label: 'Return to Entrance'
      },
      {
        type: 'info',
        yaw: 20,
        pitch: 5,
        title: 'King Size Bed',
        content: 'Featuring ergonomic smart-comfort foam with integrated sleep tracking sensors.'
      }
    ]
  },
  kitchen: {
    id: 'kitchen',
    name: 'Luxury Kitchen',
    image: '/assets/panoramas/kitchen.png',
    initialYaw: 90,
    initialPitch: 0,
    hotspots: [
      {
        type: 'nav',
        target: 'entrance',
        yaw: 120,
        pitch: -10,
        label: 'Return to Entrance'
      },
      {
        type: 'info',
        yaw: -40,
        pitch: 10,
        title: 'Smart Oven & Cooktop',
        content: 'Induction cooktop with built-in ventilation, auto-temperature sensors, and step-by-step recipe screen guidance.'
      }
    ]
  }
};
