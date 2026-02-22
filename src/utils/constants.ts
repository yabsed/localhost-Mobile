import { Region } from "react-native-maps";
import { Coordinate } from "../types/map";

export const INITIAL_REGION: Region = {
  latitude: 37.5463937599992,
  longitude: 127.065889477465,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

// Set this to null to use real GPS location again.
export const FIXED_MY_LOCATION: Coordinate | null = {
  latitude: 37.5463937599992,
  longitude: 127.065889477465,
};
