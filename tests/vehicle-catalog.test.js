import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanVehicleCatalogName,
  mergeVehicleCatalog,
  STARTER_VEHICLE_CATALOG,
} from '../src/utils/vehicleCatalog.js';

test('default Makes show multiple Models in the same Make', () => {
  const options = mergeVehicleCatalog(STARTER_VEHICLE_CATALOG);
  const toyota = options.find((row) => row.make === 'Toyota');
  assert.ok(toyota);
  assert.ok(toyota.models.includes('Innova'));
  assert.ok(toyota.models.includes('Fortuner'));
  assert.ok(toyota.models.length > 2);
});

test('workshop additions remain in their Make, not other Makes', () => {
  const options = mergeVehicleCatalog(
    STARTER_VEHICLE_CATALOG,
    [{ make: 'Toyota', models: ['My Special Model', 'Innova'] }],
    [{ make: 'Custom Motors', models: ['C1', 'C2'] }],
  );
  assert.deepEqual(options.find((row) => row.make === 'Custom Motors').models, ['C1', 'C2']);
  assert.ok(options.find((row) => row.make === 'Toyota').models.includes('My Special Model'));
  assert.equal(options.find((row) => row.make === 'Hyundai').models.includes('My Special Model'), false);
});

test('duplicate Makes, Models and inconsistent spacing collapse into unique options', () => {
  assert.deepEqual(mergeVehicleCatalog(
    [{ make: '  Toyota  ', models: ['Innova Crysta', ' INNOVA CRYSTA ', 'Fortuner'] }],
    [{ make: 'toyota', models: ['fortuner', 'Camry'] }],
  ), [{ make: 'Toyota', models: ['Camry', 'Fortuner', 'Innova Crysta'] }]);
  assert.equal(cleanVehicleCatalogName('  Land    Rover  '), 'Land Rover');
});

test('saved vehicle Make and Model appear even if not in default catalog', () => {
  const options = mergeVehicleCatalog(STARTER_VEHICLE_CATALOG,
    [{ make: 'Special Workshop Brand', models: ['Classic Model'] }]);
  assert.deepEqual(options.find((row) => row.make === 'Special Workshop Brand').models, ['Classic Model']);
});

test('invalid empty entries are excluded', () => {
  assert.deepEqual(mergeVehicleCatalog(
    [{ make: '', models: ['Should Not Appear'] }],
    [{ make: ' ', models: ['Missing Make'] }],
    [{ make: 'Valid', models: ['', '  ', 'One'] }],
  ), [{ make: 'Valid', models: ['One'] }]);
});
