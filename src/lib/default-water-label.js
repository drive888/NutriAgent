// Localize factory presets without changing saved names or user-defined containers.
const PRESETS = {
  '1': ['Small Bottle', 250, 'local_water.small'],
  '2': ['Standard Bottle', 500, 'local_water.standard'],
  '3': ['Large Bottle', 1000, 'local_water.large'],
  '4': ['Gallon Jug', 3785, 'local_water.gallon'],
};
export function waterPresetLabel(container, format) {
  const preset = PRESETS[container.id];
  return preset && container.name === preset[0] && Number(container.volumeMl) === preset[1]
    ? format(preset[2]) : container.name;
}
