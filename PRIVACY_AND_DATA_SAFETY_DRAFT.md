# TripSync Privacy and Data Safety Draft

This document is a working draft based on the current codebase. Review it with legal or compliance requirements before publishing.

## What TripSync collects and uses

### Account information

Collected from sign-up and sign-in flows:

- name
- email address
- phone number
- Firebase authentication uid

Used for:

- account creation and login
- showing user identity inside trips
- trip membership and account recovery

Stored in:

- Firebase Authentication
- Firestore `users/{uid}` documents

### Location information

Collected when the user grants foreground location permission.

Used for:

- showing the user's current position on the map
- live trip tracking
- route generation and meeting point features
- SOS location sharing inside a trip

Stored in:

- Firestore `trips/{tripId}/members/{uid}` documents
- Firestore `trips/{tripId}` documents for SOS / meeting point data

### Trip and activity data

Collected while using trips:

- trip code
- trip name
- destination and route points
- trip membership
- meeting point and reached flags
- SOS status
- location mode
- timestamps such as joinedAt, updatedAt, lastUpdatedAt

Used for:

- creating and joining trips
- synchronizing trip state between members
- marking meeting point and destination progress
- emergency coordination

Stored in:

- Firestore `trips/{tripId}`
- Firestore `trips/{tripId}/members/{uid}`

### Device-related data

Collected while tracking a trip:

- battery level

Used for:

- displaying member status
- helping the app decide how often to update location

Stored in:

- Firestore `trips/{tripId}/members/{uid}`

## What TripSync does not currently collect

Based on the current app code, TripSync does not intentionally collect:

- contacts
- photos or videos
- microphone audio
- precise background location tracking
- payment information
- health data
- device contacts

## User controls

Users can:

- sign up, sign in, and sign out
- leave a trip
- stop location tracking by leaving the trip or logging out
- deny location permission, which disables location-based features
- set or clear meeting point if they are the trip owner

## Suggested Google Play Data Safety answers

These are the closest matches for the current implementation.

### Data collected

- Personal info: name, email address, phone number
- Location: precise location
- App activity: trip participation, meeting point status, SOS usage
- Device or other IDs: Firebase auth uid
- Other: battery level and trip membership state

### Data shared

- Not intentionally shared with third parties beyond Firebase and the public map/routing services already used by the app

### Purpose

- app functionality
- analytics is not implemented
- account management
- communication
- safety and emergency coordination

### Data encrypted in transit

- yes, through Firebase and HTTPS network requests

### Data deleted on request

- account and trip data can be removed through app sign-out / leave-trip flows, but permanent account deletion is not yet implemented in the app

## Draft privacy policy wording

TripSync uses your account information, trip details, and foreground location to provide trip coordination features such as live tracking, meeting points, and SOS sharing inside a trip.

We store account and trip data in Firebase services and send map or route requests to public map services when you search for locations or request directions.

We do not intentionally collect contacts, media, microphone audio, or background location.

If you do not allow location access, location-based features will not work.

## Notes to verify before publishing

- confirm the final legal entity name for the privacy policy
- confirm whether battery level should be disclosed as device info or app activity in Play Console
- confirm whether public map endpoints should be listed in the privacy policy as third-party processors
- add an account deletion path if you want to advertise account deletion support in Play Console
