import food from './expansion-20261023-food.json';
import home from './expansion-20261023-home.json';
import tools from './expansion-20261023-tools.json';
import nature from './expansion-20261023-nature.json';
import clothes from './expansion-20261023-clothes.json';
import animals from './expansion-20261023-animals.json';
import travel from './expansion-20261023-travel.json';

/** Original stroke art; human readability and LIVE recognition remain unverified. */
export const expansion300Groups = { food, home, tools, nature, clothes, animals, travel };
export const expansion300Doodles = Object.values(expansion300Groups).flatMap(group => group.doodles);
