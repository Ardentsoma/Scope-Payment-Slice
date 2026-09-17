/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PricingCards } from './components/PricingCards';

export default function App() {
  return (
    <main className="min-h-screen bg-white text-[#09090b] flex flex-col justify-start md:justify-center items-center antialiased w-full py-6 sm:py-10 md:py-14">
      <PricingCards />
    </main>
  );
}
