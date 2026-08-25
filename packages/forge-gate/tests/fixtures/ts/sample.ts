// Fidelity fixture: non-erasable syntax ABOVE the functions under test.
// Enum and namespace lowering expands the output of amaro transform mode,
// so any function declared after them must either keep its original line
// or the whole file is rejected with a SetupError naming the construct.
export enum Color {
  Red,
  Green,
}

namespace Shading {
  export const dim = 0.5;
}

export function tangled(shade: Color): number {
  if (shade === Color.Red) {
    if (Shading.dim > 0.4) {
      return 1;
    }
  }
  return 0;
}
