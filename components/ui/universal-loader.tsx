import React from 'react';

export const UniversalLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center justify-center">
        
        {/* 1. BOUNCER: Handles Vertical Movement */}
        <div className="bouncer relative z-10 h-16 w-16">
          
          {/* 2. SPINNER: Handles Rotation (Ball + Logo) */}
          <div className="spinner relative h-full w-full">
            
            {/* LIGHT MODE: Black/White Ball + White KC Icon */}
            <div className="block dark:hidden h-full w-full relative">
              <img 
                src="/icons/football.svg" 
                alt="Loading..." 
                className="h-full w-full object-contain drop-shadow-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <img 
                   src="/icons/kc-white.svg" 
                   alt="KC" 
                   /* Adjusted: translate-x moves it into the visual center of the pentagon */
                   className="h-3.5 w-3.5 object-contain  translate-x-[5px] -translate-y-[0.5px]" 
                 />
              </div>
            </div>

            {/* DARK MODE: Green/White Ball + Black KC Icon */}
            <div className="hidden dark:block h-full w-full relative">
              <img 
                src="/icons/footballgreen.svg" 
                alt="Loading..." 
                className="h-full w-full object-contain drop-shadow-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <img 
                   src="/icons/kc-black.svg" 
                   alt="KC" 
                   /* Adjusted: translate-x moves it into the visual center of the pentagon */
                   className="h-3.5 w-3.5 object-contain translate-x-[5px] -translate-y-[0.5px]" 
                 />
              </div>
            </div>
          </div>

          {/* 3. STREAKS: "Swoosh" lines */}
          <div className="streaks absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 pointer-events-none">
             <div className="streak streak-1 bg-[#222222]/80 dark:bg-[#22c55e]/80 shadow-[0_0_4px_rgba(0,0,0,0.1)] dark:shadow-[0_0_4px_rgba(34,197,94,0.4)]"></div>
             <div className="streak streak-2 bg-[#222222]/80 dark:bg-[#22c55e]/80 shadow-[0_0_4px_rgba(0,0,0,0.1)] dark:shadow-[0_0_4px_rgba(34,197,94,0.4)]"></div>
             <div className="streak streak-3 bg-[#222222]/80 dark:bg-[#22c55e]/80 shadow-[0_0_4px_rgba(0,0,0,0.1)] dark:shadow-[0_0_4px_rgba(34,197,94,0.4)]"></div>
          </div>
        </div>

        {/* 4. BASE: Shadow & Minimal Text */}
        <div className="flex flex-col items-center mt-4">
          <div className="shadow-anim h-2 w-12 rounded-[100%] bg-black/20 blur-sm dark:bg-black/40"></div>
          <p className="mt-4 text-[10px] font-bold tracking-[0.4em] uppercase text-muted-foreground/30 font-qualyneue">
            Khel<span className="font-light">Connect</span>
          </p>
        </div>
      </div>

      <style jsx>{`
        .bouncer { animation: bounce-move 1.5s linear infinite; }
        .spinner { animation: spin-cycle 1.5s linear infinite; }
        .shadow-anim { animation: shadow-cycle 1.5s linear infinite; }

        .streak { position: absolute; height: 3px; border-radius: 99px; opacity: 0; }
        .streak-1 { width: 50px; top: 40%; left: -30px; animation: swoosh 1.5s infinite 0s; }
        .streak-2 { width: 70px; top: 50%; left: -50px; animation: swoosh 1.5s infinite 0.05s; }
        .streak-3 { width: 40px; top: 60%; left: -20px; animation: swoosh 1.5s infinite 0.1s; }

        @keyframes bounce-move {
          0%, 40% { transform: translateY(0) scale(1); animation-timing-function: ease-in; }
          55% { transform: translateY(15px) scaleY(0.95) scaleX(1.05); animation-timing-function: ease-out; } 
          70% { transform: translateY(0) scale(1); animation-timing-function: ease-in; } 
          85% { transform: translateY(15px) scaleY(0.95) scaleX(1.05); animation-timing-function: ease-out; }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes spin-cycle {
          0% { transform: rotate(0deg); }
          40% { transform: rotate(720deg); } 
          100% { transform: rotate(720deg); } 
        }

        @keyframes swoosh {
          0% { opacity: 0; transform: translateX(10px); }
          10% { opacity: 1; transform: translateX(-10px); } 
          30% { opacity: 1; transform: translateX(-5px); }
          40% { opacity: 0; transform: translateX(-20px); } 
          100% { opacity: 0; }
        }

        @keyframes shadow-cycle {
          0%, 40% { transform: scale(0.8); opacity: 0.3; animation-timing-function: ease-in; }
          55%, 85% { transform: scale(1.1); opacity: 0.5; animation-timing-function: ease-out; }
          70%, 100% { transform: scale(0.8); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};