## ADDED Requirements

### Requirement: Send custom email to candidates
The system SHALL provide an endpoint `POST /selection-process/send-email` that accepts a list of candidate IDs, an email subject, an HTML body, and a plain-text body, sends the email to each candidate, and returns the aggregated count of successes and errors.

Access SHALL be restricted to users with role `assessor` or `presidente`.

#### Scenario: All emails sent successfully
- **WHEN** a valid request is made with `candidate_ids`, `subject`, `html`, and `plain_text`, and all candidates exist
- **THEN** the system returns HTTP 200 with `{ successes: N, errors: 0 }` where N equals the number of candidate IDs provided

#### Scenario: Some emails fail to send
- **WHEN** one or more email deliveries fail (e.g., SMTP error)
- **THEN** the system returns HTTP 200 with `{ successes: S, errors: E }` where S + E equals the total number of candidate IDs, and the remaining emails are still attempted

#### Scenario: One or more candidate IDs do not exist
- **WHEN** any ID in `candidate_ids` does not correspond to an existing candidate
- **THEN** the system returns HTTP 404 before sending any email

#### Scenario: Request body is missing required fields
- **WHEN** the request body is missing `candidate_ids`, `subject`, `html`, or `plain_text`
- **THEN** the system returns HTTP 400 with validation error details

#### Scenario: Unauthorized access
- **WHEN** the request is made by a user without role `assessor` or `presidente`
- **THEN** the system returns HTTP 403
