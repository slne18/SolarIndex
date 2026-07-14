declare module "@svg-maps/france.departments" {
  interface MapLocation {
    name: string;
    id: string;
    path: string;
  }
  interface FranceDepartmentsMap {
    label: string;
    viewBox: string;
    locations: MapLocation[];
  }
  const franceDepartments: FranceDepartmentsMap;
  export default franceDepartments;
}
