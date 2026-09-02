import React from 'react';

// Ejemplo de datos de productos para la galería
const DUMMY_PRODUCTS = [
  {
    id: 1,
    title: 'THE ZONE OF INTEREST ORIGINAL SCORE',
    price: '40 DKK',
    image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'STOP MAKING SENSE DELUXE EDITION',
    price: '45 DKK',
    image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'UNCUT GEMS ORIGINAL MOTION PICTURE SOUNDTRACK',
    price: '35 DKK',
    image: 'https://images.unsplash.com/photo-1621360811013-c76831f1628c?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'MIDSOMMAR ORIGINAL SCORE',
    price: '40 DKK',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 5,
    title: 'PAST LIVES ORIGINAL SCORE',
    price: '30 DKK',
    image: 'https://images.unsplash.com/photo-1493225457284-0bf53ce01258?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 6,
    title: 'HEREDITARY ORIGINAL SCORE',
    price: '35 DKK',
    image: 'https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 7,
    title: 'MINARI ORIGINAL MOTION PICTURE SOUNDTRACK',
    price: '35 DKK',
    image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 8,
    title: 'MOONLIGHT ORIGINAL SCORE',
    price: '40 DKK',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1000&auto=format&fit=crop',
  }
];

const A24Gallery = ({ products = DUMMY_PRODUCTS }) => {
  return (
    <div className="w-full bg-white text-black font-sans pb-20 pt-10 px-4 md:px-10">
      
      {/* Título de la sección (Opcional, estilo brutalista) */}
      <h2 className="text-sm font-bold uppercase tracking-tight mb-4 border-b border-black pb-2">
        Catálogo
      </h2>

      {/* 
        Contenedor de la Grilla Brutalista 
        - grid-cols-2 en móvil, grid-cols-4 en desktop
        - Borde superior e izquierdo en el contenedor principal para evitar bordes dobles
      */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l border-black">
        
        {products.map((product) => (
          <div 
            key={product.id}
            // Borde derecho e inferior en cada ítem para completar la grilla
            // Interacción binaria: hover:bg-black hover:text-white transition-none
            className="group flex flex-col border-r border-b border-black bg-white hover:bg-black hover:text-white transition-none cursor-pointer"
          >
            {/* 
              Contenedor de imagen 
              - Proporción cuadrada o rectangular (aspect-square)
              - Borde inferior para separar la imagen del texto. Cambia a blanco en hover.
            */}
            <div className="aspect-[4/5] w-full border-b border-black group-hover:border-white transition-none overflow-hidden">
              {/* 
                Imagen asfixiada
                - w-full h-full object-cover sin padding
              */}
              <img 
                src={product.image} 
                alt={product.title} 
                className="w-full h-full object-cover transition-none group-hover:opacity-90"
              />
            </div>

            {/* 
              Contenedor de texto
              - Tipografía utilitaria: uppercase, font-bold, tracking-tight, text-xs
            */}
            <div className="p-3 md:p-4 flex flex-col justify-between flex-grow min-h-[80px]">
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-tight leading-tight line-clamp-3">
                {product.title}
              </h3>
              <p className="text-xs md:text-sm font-bold uppercase tracking-tight mt-4">
                {product.price}
              </p>
            </div>

          </div>
        ))}

      </div>
    </div>
  );
};

export default A24Gallery;
