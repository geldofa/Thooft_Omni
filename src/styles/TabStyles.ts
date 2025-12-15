// src/styles/tabStyles.ts

// 1. CONTAINER: Changed p-6 to 'py-6 px-2'
//    py-6 = Keeps the tall "fat" height you liked.
//    px-2 = Reduces the massive gap on the left/right sides.
export const pillListClass = "bg-gray-100 py-6 px-2 rounded-xl gap-1 border border-transparent inline-flex items-center !h-auto";

// 2. BUTTONS: Made hover darker and solid
export const pillTriggerClass = `
  rounded-lg px-2 py-2 gap-2 font-medium transition-all duration-200 ease-in-out
  !h-auto
  !text-gray-500
  
  /* HOVER FIX: 
     Changed 'hover:bg-gray-200/50' to 'hover:!bg-gray-200' (solid) 
     or 'hover:!bg-gray-300' if you want it even darker.
     Added '!text-black' to ensure text turns black.
  */
  hover:!text-black hover:!bg-gray-200
  
  active:scale-95
  data-[state=active]:!bg-white
  data-[state=active]:!text-black
  data-[state=active]:!shadow-md
`;