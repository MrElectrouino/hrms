--
-- PostgreSQL database dump
--

\restrict nkYKnHITgJO08Z7xJz0FtdYtHYMFg4LbaiVwP9BwV6ao2lPQKMtWAUqDAbfSFf2

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id bigint NOT NULL,
    "userId" integer NOT NULL,
    "logTypeId" integer NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: application_branding; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_branding (
    id integer DEFAULT 1 NOT NULL,
    "appName" text DEFAULT 'HRMS'::text NOT NULL,
    "logoFileId" bigint,
    "faviconFileId" bigint,
    "primaryColor" text,
    "secondaryColor" text,
    "accentColor" text,
    "loginBrandingText" text,
    "footerText" text,
    "updatedByProfileId" integer,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.application_branding OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    "actorProfileId" integer,
    action text NOT NULL,
    "entityType" text,
    "entityId" text,
    "ipAddress" text,
    metadata jsonb,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    "profileId" integer NOT NULL,
    "accountName" text,
    "accountNoEnc" text,
    "accountNoHash" text,
    "bankName" text,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_accounts_id_seq OWNER TO postgres;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    "isoCode" text NOT NULL,
    name text NOT NULL,
    "currencyCode" text NOT NULL,
    "defaultTimezone" text NOT NULL,
    "defaultLanguage" text NOT NULL,
    "dateFormat" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.countries_id_seq OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: custom_field_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_field_definitions (
    id integer NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    "tabKey" text NOT NULL,
    "sectionName" text NOT NULL,
    "fieldType" text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    "countryCode" text DEFAULT 'ALL'::text NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "isSensitive" boolean DEFAULT false NOT NULL,
    "helpText" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdByProfileId" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    placeholder text
);


ALTER TABLE public.custom_field_definitions OWNER TO postgres;

--
-- Name: custom_field_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_field_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_field_definitions_id_seq OWNER TO postgres;

--
-- Name: custom_field_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_field_definitions_id_seq OWNED BY public.custom_field_definitions.id;


--
-- Name: custom_field_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_field_values (
    id integer NOT NULL,
    "employeeId" integer NOT NULL,
    "definitionId" integer NOT NULL,
    value jsonb NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.custom_field_values OWNER TO postgres;

--
-- Name: custom_field_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_field_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_field_values_id_seq OWNER TO postgres;

--
-- Name: custom_field_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_field_values_id_seq OWNED BY public.custom_field_values.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: dependants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dependants (
    id integer NOT NULL,
    "dependantProfileId" integer NOT NULL,
    "employeeProfileId" integer NOT NULL,
    "relationTypeId" integer
);


ALTER TABLE public.dependants OWNER TO postgres;

--
-- Name: dependants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dependants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dependants_id_seq OWNER TO postgres;

--
-- Name: dependants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dependants_id_seq OWNED BY public.dependants.id;


--
-- Name: document_field_values; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_field_values (
    id bigint NOT NULL,
    "documentId" bigint NOT NULL,
    "fieldId" integer NOT NULL,
    value text,
    "valueEnc" text
);


ALTER TABLE public.document_field_values OWNER TO postgres;

--
-- Name: document_field_values_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_field_values_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_field_values_id_seq OWNER TO postgres;

--
-- Name: document_field_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_field_values_id_seq OWNED BY public.document_field_values.id;


--
-- Name: document_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_files (
    id bigint NOT NULL,
    "documentId" bigint NOT NULL,
    "fileId" bigint NOT NULL,
    "fieldId" integer,
    "isCurrent" boolean DEFAULT true NOT NULL,
    "uploadedById" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.document_files OWNER TO postgres;

--
-- Name: document_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_files_id_seq OWNER TO postgres;

--
-- Name: document_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_files_id_seq OWNED BY public.document_files.id;


--
-- Name: document_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_types (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.document_types OWNER TO postgres;

--
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_types_id_seq OWNER TO postgres;

--
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.document_types.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    "documentTypeId" integer NOT NULL,
    "profileId" integer NOT NULL,
    "issueDate" date,
    "expiryDate" date,
    "identityNoEnc" text,
    "identityNoHash" text,
    "documentTitle" text,
    remarks text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isSelf" boolean DEFAULT true NOT NULL,
    "companyId" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" integer,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: employee_profile_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_profile_sections (
    id integer NOT NULL,
    "employeeId" integer NOT NULL,
    "sectionKey" text NOT NULL,
    data jsonb NOT NULL,
    "updatedByProfileId" integer,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.employee_profile_sections OWNER TO postgres;

--
-- Name: employee_profile_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_profile_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_profile_sections_id_seq OWNER TO postgres;

--
-- Name: employee_profile_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_profile_sections_id_seq OWNED BY public.employee_profile_sections.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    "profileId" integer NOT NULL,
    "employeeCode" text NOT NULL,
    "reportingToId" integer,
    "sourceOfHireId" integer,
    "locationId" integer,
    "siteId" integer,
    "employeeStatusId" integer,
    "employeeTypeId" integer,
    "contractTypeId" integer,
    "workPhone" text,
    extension text,
    "workEmail" text,
    "dateOfJoining" timestamp(3) with time zone NOT NULL,
    "dateOfConfirmation" timestamp(3) with time zone,
    "personIdNumberEnc" text,
    "personIdNumberHash" text,
    designation text,
    "shiftId" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "exitUploadId" integer,
    "isWPSProcessing" boolean,
    "isSalaryProcessing" boolean,
    "isAttendanceProcessing" boolean,
    "companyMobileNo" text,
    "companyLandNo" text,
    "payrollSiteId" integer,
    "isAllowedAdvanceLeave" boolean
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: expiry_alert_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expiry_alert_logs (
    id bigint NOT NULL,
    "documentId" bigint NOT NULL,
    "alertWindow" text NOT NULL,
    "sentAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    recipients text NOT NULL,
    "runId" text NOT NULL
);


ALTER TABLE public.expiry_alert_logs OWNER TO postgres;

--
-- Name: expiry_alert_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expiry_alert_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expiry_alert_logs_id_seq OWNER TO postgres;

--
-- Name: expiry_alert_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expiry_alert_logs_id_seq OWNED BY public.expiry_alert_logs.id;


--
-- Name: form_entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_entities (
    id integer NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    "legacyTableName" text,
    "legacyPrimaryKey" text,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.form_entities OWNER TO postgres;

--
-- Name: form_entities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_entities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_entities_id_seq OWNER TO postgres;

--
-- Name: form_entities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_entities_id_seq OWNED BY public.form_entities.id;


--
-- Name: form_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_fields (
    id integer NOT NULL,
    "entityId" integer NOT NULL,
    "fieldName" text NOT NULL,
    "displayName" text NOT NULL,
    "dataTypeId" integer NOT NULL,
    "isMandatory" boolean DEFAULT false NOT NULL,
    "validationRegex" text,
    "isForeignKey" boolean DEFAULT false NOT NULL,
    "foreignEntityId" integer,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isGridVisible" boolean DEFAULT true NOT NULL,
    "documentTypeId" integer,
    config jsonb
);


ALTER TABLE public.form_fields OWNER TO postgres;

--
-- Name: form_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_fields_id_seq OWNER TO postgres;

--
-- Name: form_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_fields_id_seq OWNED BY public.form_fields.id;


--
-- Name: holiday_calendar_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holiday_calendar_entries (
    id integer NOT NULL,
    "holidayListId" integer NOT NULL,
    "profileId" integer NOT NULL,
    date date NOT NULL,
    "prevHolidayDate" date
);


ALTER TABLE public.holiday_calendar_entries OWNER TO postgres;

--
-- Name: holiday_calendar_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holiday_calendar_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holiday_calendar_entries_id_seq OWNER TO postgres;

--
-- Name: holiday_calendar_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holiday_calendar_entries_id_seq OWNED BY public.holiday_calendar_entries.id;


--
-- Name: holiday_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.holiday_lists (
    id integer NOT NULL,
    name text NOT NULL,
    "siteId" integer,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.holiday_lists OWNER TO postgres;

--
-- Name: holiday_lists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.holiday_lists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.holiday_lists_id_seq OWNER TO postgres;

--
-- Name: holiday_lists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.holiday_lists_id_seq OWNED BY public.holiday_lists.id;


--
-- Name: languages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.languages (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.languages OWNER TO postgres;

--
-- Name: languages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.languages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.languages_id_seq OWNER TO postgres;

--
-- Name: languages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.languages_id_seq OWNED BY public.languages.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    "parentId" integer,
    name text NOT NULL,
    "pageUrl" text,
    "iconClass" text,
    "displayOrder" integer NOT NULL,
    "isMainMenu" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_items_id_seq OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: menu_user_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_user_overrides (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "menuItemId" integer NOT NULL,
    "isInclude" boolean NOT NULL,
    "pageUrlOverride" text
);


ALTER TABLE public.menu_user_overrides OWNER TO postgres;

--
-- Name: menu_user_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_user_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_user_overrides_id_seq OWNER TO postgres;

--
-- Name: menu_user_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_user_overrides_id_seq OWNED BY public.menu_user_overrides.id;


--
-- Name: menu_user_type_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_user_type_permissions (
    id integer NOT NULL,
    "userTypeId" integer NOT NULL,
    "menuItemId" integer NOT NULL,
    "pageUrlOverride" text,
    "isCreate" boolean DEFAULT false NOT NULL,
    "isEdit" boolean DEFAULT false NOT NULL,
    "isDelete" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.menu_user_type_permissions OWNER TO postgres;

--
-- Name: menu_user_type_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_user_type_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_user_type_permissions_id_seq OWNER TO postgres;

--
-- Name: menu_user_type_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_user_type_permissions_id_seq OWNED BY public.menu_user_type_permissions.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    code text NOT NULL,
    text text NOT NULL,
    "shortDesc" text,
    "messageTypeId" integer NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: module_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_configurations (
    id integer NOT NULL,
    "moduleKey" text NOT NULL,
    name text NOT NULL,
    "isEnabled" boolean DEFAULT false NOT NULL,
    "isImplemented" boolean DEFAULT false NOT NULL,
    "dependsOn" text[] DEFAULT ARRAY[]::text[],
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "updatedByProfileId" integer,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.module_configurations OWNER TO postgres;

--
-- Name: module_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.module_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.module_configurations_id_seq OWNER TO postgres;

--
-- Name: module_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.module_configurations_id_seq OWNED BY public.module_configurations.id;


--
-- Name: one_time_login_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.one_time_login_tokens (
    id bigint NOT NULL,
    "userId" integer NOT NULL,
    "tokenHash" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "usedAt" timestamp(3) with time zone,
    "usedIp" text
);


ALTER TABLE public.one_time_login_tokens OWNER TO postgres;

--
-- Name: one_time_login_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.one_time_login_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.one_time_login_tokens_id_seq OWNER TO postgres;

--
-- Name: one_time_login_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.one_time_login_tokens_id_seq OWNED BY public.one_time_login_tokens.id;


--
-- Name: parameter_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parameter_types (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.parameter_types OWNER TO postgres;

--
-- Name: parameter_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parameter_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parameter_types_id_seq OWNER TO postgres;

--
-- Name: parameter_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parameter_types_id_seq OWNED BY public.parameter_types.id;


--
-- Name: parameters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parameters (
    id integer NOT NULL,
    "parameterTypeId" integer NOT NULL,
    text text NOT NULL,
    "parameterValue" integer,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    code text
);


ALTER TABLE public.parameters OWNER TO postgres;

--
-- Name: parameters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parameters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parameters_id_seq OWNER TO postgres;

--
-- Name: parameters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parameters_id_seq OWNED BY public.parameters.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id bigint NOT NULL,
    "userId" integer NOT NULL,
    "tokenHash" text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "usedAt" timestamp(3) with time zone,
    "requestedIp" text,
    "usedIp" text
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: profile_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile_departments (
    "profileId" integer NOT NULL,
    "departmentId" integer NOT NULL
);


ALTER TABLE public.profile_departments OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id integer NOT NULL,
    "userTypeId" integer,
    "statusId" integer,
    "customerId" integer,
    name text NOT NULL,
    "middleName" text,
    "lastName" text,
    email text,
    "contactNo" text,
    "dateOfBirth" date,
    "maritalStatusId" integer,
    "genderId" integer,
    "motherTongueId" integer,
    "bloodGroupId" integer,
    "nationalityId" integer,
    "visaTypeId" integer,
    "photoFileId" bigint,
    address text,
    "linkId" integer,
    "isSiteAccess" boolean DEFAULT false NOT NULL,
    qualification text,
    "homeCountryAddress" text,
    "homeCountryPhoneNo" text,
    "contractTypeId" integer,
    "dateOfExit" timestamp(3) with time zone,
    "exitReasonCode" integer,
    "exitRemarks" text,
    "dateOfRejoining" timestamp(3) with time zone,
    "passportNoEnc" text,
    "passportNoHash" text,
    "emiratesIdEnc" text,
    "emiratesIdHash" text,
    "molNoEnc" text,
    "molNoHash" text,
    "visaNoEnc" text,
    "visaNoHash" text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" integer,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profiles_id_seq OWNER TO postgres;

--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: salary_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_templates (
    id integer NOT NULL,
    name text NOT NULL,
    "countryCode" text DEFAULT 'ALL'::text NOT NULL,
    components jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdByProfileId" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.salary_templates OWNER TO postgres;

--
-- Name: salary_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_templates_id_seq OWNER TO postgres;

--
-- Name: salary_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_templates_id_seq OWNED BY public.salary_templates.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id bigint NOT NULL,
    "userId" integer NOT NULL,
    "refreshTokenHash" text NOT NULL,
    "issuedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL,
    "lastUsedAt" timestamp(3) with time zone NOT NULL,
    "rotatedAt" timestamp(3) with time zone,
    "revokedAt" timestamp(3) with time zone,
    "revokedReason" text,
    "ipAddress" text,
    "userAgent" text,
    "familyId" text NOT NULL,
    "familyStartedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    name text NOT NULL,
    "startTime" time without time zone NOT NULL,
    "endTime" time without time zone NOT NULL,
    "lateMinutes" integer NOT NULL,
    "halfDayMinutes" integer NOT NULL,
    "altStartTime" time without time zone,
    "altEndTime" time without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" integer,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_id_seq OWNER TO postgres;

--
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- Name: sites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sites (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.sites OWNER TO postgres;

--
-- Name: sites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sites_id_seq OWNER TO postgres;

--
-- Name: sites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sites_id_seq OWNED BY public.sites.id;


--
-- Name: stored_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stored_files (
    id bigint NOT NULL,
    "originalName" text NOT NULL,
    "legacyFolderPath" text,
    "storageKey" text NOT NULL,
    "mimeType" text,
    "sizeBytes" bigint,
    sha256 text,
    "fileTypeId" integer,
    "createdById" integer,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.stored_files OWNER TO postgres;

--
-- Name: stored_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stored_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stored_files_id_seq OWNER TO postgres;

--
-- Name: stored_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stored_files_id_seq OWNED BY public.stored_files.id;


--
-- Name: system_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_configurations (
    id integer NOT NULL,
    name text NOT NULL,
    value text,
    "valueDate" date,
    "valueKind" text DEFAULT 'string'::text NOT NULL,
    description text
);


ALTER TABLE public.system_configurations OWNER TO postgres;

--
-- Name: system_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_configurations_id_seq OWNER TO postgres;

--
-- Name: system_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_configurations_id_seq OWNED BY public.system_configurations.id;


--
-- Name: user_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activities (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "lastLoginAt" timestamp(3) with time zone,
    "lastIpUsed" text,
    "passwordChangedAt" timestamp(3) with time zone,
    "isPasswordReset" boolean DEFAULT false NOT NULL,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "failedLoginAttemptAt" timestamp(3) with time zone,
    "lockedUntil" timestamp(3) with time zone
);


ALTER TABLE public.user_activities OWNER TO postgres;

--
-- Name: user_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activities_id_seq OWNER TO postgres;

--
-- Name: user_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_activities_id_seq OWNED BY public.user_activities.id;


--
-- Name: user_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_types (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.user_types OWNER TO postgres;

--
-- Name: user_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_types_id_seq OWNER TO postgres;

--
-- Name: user_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_types_id_seq OWNED BY public.user_types.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    "profileId" integer NOT NULL,
    "userTypeId" integer NOT NULL,
    username text NOT NULL,
    "passwordHash" text,
    "legacyPasswordEnc" text,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: weekly_off_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_off_assignments (
    id integer NOT NULL,
    "profileId" integer NOT NULL,
    "weeklyOffConfigId" integer NOT NULL,
    year integer NOT NULL
);


ALTER TABLE public.weekly_off_assignments OWNER TO postgres;

--
-- Name: weekly_off_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_off_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_off_assignments_id_seq OWNER TO postgres;

--
-- Name: weekly_off_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_off_assignments_id_seq OWNED BY public.weekly_off_assignments.id;


--
-- Name: weekly_off_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_off_configs (
    id integer NOT NULL,
    name text NOT NULL,
    "siteId" integer,
    "daysOfWeek" integer[],
    year integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.weekly_off_configs OWNER TO postgres;

--
-- Name: weekly_off_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_off_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_off_configs_id_seq OWNER TO postgres;

--
-- Name: weekly_off_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_off_configs_id_seq OWNED BY public.weekly_off_configs.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: custom_field_definitions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions ALTER COLUMN id SET DEFAULT nextval('public.custom_field_definitions_id_seq'::regclass);


--
-- Name: custom_field_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_values ALTER COLUMN id SET DEFAULT nextval('public.custom_field_values_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: dependants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependants ALTER COLUMN id SET DEFAULT nextval('public.dependants_id_seq'::regclass);


--
-- Name: document_field_values id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_field_values ALTER COLUMN id SET DEFAULT nextval('public.document_field_values_id_seq'::regclass);


--
-- Name: document_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_files ALTER COLUMN id SET DEFAULT nextval('public.document_files_id_seq'::regclass);


--
-- Name: document_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: employee_profile_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profile_sections ALTER COLUMN id SET DEFAULT nextval('public.employee_profile_sections_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: expiry_alert_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expiry_alert_logs ALTER COLUMN id SET DEFAULT nextval('public.expiry_alert_logs_id_seq'::regclass);


--
-- Name: form_entities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_entities ALTER COLUMN id SET DEFAULT nextval('public.form_entities_id_seq'::regclass);


--
-- Name: form_fields id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields ALTER COLUMN id SET DEFAULT nextval('public.form_fields_id_seq'::regclass);


--
-- Name: holiday_calendar_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_calendar_entries ALTER COLUMN id SET DEFAULT nextval('public.holiday_calendar_entries_id_seq'::regclass);


--
-- Name: holiday_lists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_lists ALTER COLUMN id SET DEFAULT nextval('public.holiday_lists_id_seq'::regclass);


--
-- Name: languages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages ALTER COLUMN id SET DEFAULT nextval('public.languages_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: menu_user_overrides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_overrides ALTER COLUMN id SET DEFAULT nextval('public.menu_user_overrides_id_seq'::regclass);


--
-- Name: menu_user_type_permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_type_permissions ALTER COLUMN id SET DEFAULT nextval('public.menu_user_type_permissions_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: module_configurations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_configurations ALTER COLUMN id SET DEFAULT nextval('public.module_configurations_id_seq'::regclass);


--
-- Name: one_time_login_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.one_time_login_tokens ALTER COLUMN id SET DEFAULT nextval('public.one_time_login_tokens_id_seq'::regclass);


--
-- Name: parameter_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parameter_types ALTER COLUMN id SET DEFAULT nextval('public.parameter_types_id_seq'::regclass);


--
-- Name: parameters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parameters ALTER COLUMN id SET DEFAULT nextval('public.parameters_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: salary_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_templates ALTER COLUMN id SET DEFAULT nextval('public.salary_templates_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- Name: sites id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites ALTER COLUMN id SET DEFAULT nextval('public.sites_id_seq'::regclass);


--
-- Name: stored_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files ALTER COLUMN id SET DEFAULT nextval('public.stored_files_id_seq'::regclass);


--
-- Name: system_configurations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configurations ALTER COLUMN id SET DEFAULT nextval('public.system_configurations_id_seq'::regclass);


--
-- Name: user_activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities ALTER COLUMN id SET DEFAULT nextval('public.user_activities_id_seq'::regclass);


--
-- Name: user_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_types ALTER COLUMN id SET DEFAULT nextval('public.user_types_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: weekly_off_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_assignments ALTER COLUMN id SET DEFAULT nextval('public.weekly_off_assignments_id_seq'::regclass);


--
-- Name: weekly_off_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_configs ALTER COLUMN id SET DEFAULT nextval('public.weekly_off_configs_id_seq'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d784325b-02e3-47c9-9880-44c41c2e5d69	48a434d6c290f4067df9ff9c2812a401fa135efa15cc2ed4a539a386b37a926f	2026-10-29 18:19:43.757611+05:30	20261029124942_init	\N	\N	2026-10-29 18:19:42.670935+05:30	1
d1cb78c6-4d1b-4c7f-8a32-4ee5a6dc0686	8d794447e4a8131a13fcc06d915d5ec3b3a21bf3c80ccc0e29f8876165d805e3	2026-11-11 15:14:54.959048+05:30	20261103090000_session_family	\N	\N	2026-11-11 15:14:54.542831+05:30	1
31fd0cf9-b137-4dbe-8f15-0e9201f9e103	dec065ab65e1ca3ee0f4e18ddd04e914ddf9687928cf3e972a482da22c18e0e8	2026-11-12 10:48:17.684446+05:30	20261111140212_employee_profile_sections	\N	\N	2026-11-12 10:48:17.57162+05:30	1
8cf3d2f3-0a70-49db-a9ed-a564e0bafe9f	89d79f9ad41e6d1ee58fff09e4be2b03fda62ceb841e2f1b9ed4c5f61253e609	2026-11-12 10:48:17.703907+05:30	20261111153814_salary_templates	\N	\N	2026-11-12 10:48:17.685315+05:30	1
32d2f449-ae27-49da-8780-b7b861015e8e	df5c637db792c814aa1f0714f589e3cab750fcb0486e130b6b43846f94690275	2026-11-13 18:12:02.632908+05:30	20261113124202_system_application	\N	\N	2026-11-13 18:12:02.383302+05:30	1
842c261b-5b70-4a6d-ae76-cd5f102168ab	cfc7954ba7503ce4c46704234f5ab7bd8df4272ead567f880d64588bb21ec1ef	2026-11-13 18:16:52.248147+05:30	20261113124652_application_branding	\N	\N	2026-11-13 18:16:52.179239+05:30	1
e433f9dd-24b0-4bbd-be35-4ab376ad2459	5ee997a278b53b73c6d7c81df3ab45f455729aa5abd8d4a17e595304d36722f0	2026-11-13 18:21:14.110993+05:30	20261113125114_custom_field_placeholder	\N	\N	2026-11-13 18:21:14.079924+05:30	1
45b6f2c5-9392-4759-9af3-c2aa2a282a17	5ad3229e07a1b951679c63f29e1da467c345ac91a667805405da51060c6173a2	2026-11-13 18:29:03.868862+05:30	20261113125903_module_configuration	\N	\N	2026-11-13 18:29:03.798411+05:30	1
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, "userId", "logTypeId", "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: application_branding; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_branding (id, "appName", "logoFileId", "faviconFileId", "primaryColor", "secondaryColor", "accentColor", "loginBrandingText", "footerText", "updatedByProfileId", "updatedAt") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "actorProfileId", action, "entityType", "entityId", "ipAddress", metadata, "createdAt") FROM stdin;
1	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "1", "mustChangePassword": false}	2026-10-29 18:25:15.385+05:30
2	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "2", "mustChangePassword": false}	2026-10-29 18:26:00.298+05:30
3	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "3", "mustChangePassword": false}	2026-10-29 18:51:58.19+05:30
4	1	LOGOUT	Session	3	::ffff:127.0.0.1	{}	2026-10-29 19:01:59.331+05:30
5	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "4", "mustChangePassword": false}	2026-10-29 19:02:13.862+05:30
6	\N	TOKEN_REFRESHED	Session	5	::ffff:127.0.0.1	{"previousSessionId": "4"}	2026-10-29 19:17:23.883+05:30
7	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "6", "mustChangePassword": false}	2026-10-29 19:18:42.609+05:30
8	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "7", "mustChangePassword": false}	2026-10-29 19:20:51.379+05:30
9	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "8", "mustChangePassword": false}	2026-10-29 19:21:57.867+05:30
10	\N	TOKEN_REFRESHED	Session	9	::ffff:127.0.0.1	{"previousSessionId": "6"}	2026-10-30 10:32:24.618+05:30
11	\N	TOKEN_REFRESHED	Session	10	::ffff:127.0.0.1	{"previousSessionId": "5"}	2026-10-30 10:32:32.129+05:30
12	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "11", "mustChangePassword": false}	2026-10-30 10:37:30.646+05:30
13	\N	TOKEN_REFRESHED	Session	12	::ffff:127.0.0.1	{"previousSessionId": "11"}	2026-10-30 11:04:30.336+05:30
14	\N	TOKEN_REFRESHED	Session	13	::ffff:127.0.0.1	{"previousSessionId": "12"}	2026-10-30 11:20:53.712+05:30
15	1	LOGOUT	Session	13	::ffff:127.0.0.1	{}	2026-10-30 11:27:40.242+05:30
16	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "14", "mustChangePassword": false}	2026-10-30 11:31:40.855+05:30
17	\N	TOKEN_REFRESHED	Session	15	::ffff:127.0.0.1	{"previousSessionId": "9"}	2026-10-30 11:39:42.201+05:30
18	1	LOGOUT	Session	15	::ffff:127.0.0.1	{}	2026-10-30 11:39:45.518+05:30
19	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "16", "mustChangePassword": false}	2026-10-30 11:40:18.916+05:30
20	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "17", "mustChangePassword": false}	2026-10-30 11:40:52.471+05:30
21	1	LOGOUT	Session	14	::ffff:127.0.0.1	{}	2026-10-30 11:42:09.352+05:30
22	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "18", "mustChangePassword": false}	2026-10-30 12:17:59.875+05:30
23	1	LOGOUT	Session	18	::ffff:127.0.0.1	{}	2026-10-30 12:25:46.315+05:30
24	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "19", "mustChangePassword": false}	2026-10-30 12:42:48.915+05:30
25	\N	TOKEN_REFRESHED	Session	20	::ffff:127.0.0.1	{"previousSessionId": "19"}	2026-10-30 14:15:43.678+05:30
26	\N	TOKEN_REFRESHED	Session	21	::ffff:127.0.0.1	{"previousSessionId": "20"}	2026-10-30 15:04:18.864+05:30
27	\N	TOKEN_REFRESHED	Session	22	::ffff:127.0.0.1	{"previousSessionId": "21"}	2026-10-30 19:04:35.893+05:30
28	1	LOGIN_SUCCESS	User	1	::ffff:127.0.0.1	{"sessionId": "23", "mustChangePassword": false}	2026-11-02 10:50:34.638+05:30
29	1	USER_CREATED	User	2	::ffff:127.0.0.1	{"profileId": 2, "userTypeId": 1}	2026-11-02 11:00:16.408+05:30
30	\N	TOKEN_REFRESHED	Session	24	::ffff:127.0.0.1	{"previousSessionId": "23"}	2026-11-02 16:37:47.289+05:30
31	\N	TOKEN_REFRESHED	Session	25	::ffff:127.0.0.1	{"previousSessionId": "24"}	2026-11-02 16:52:47.268+05:30
32	1	USER_UPDATED	User	2	::ffff:127.0.0.1	{"changes": {"isActive": true, "userTypeId": 2}}	2026-11-02 16:57:10.8+05:30
33	\N	TOKEN_REFRESHED	Session	26	::ffff:127.0.0.1	{"previousSessionId": "25"}	2026-11-02 17:12:33.337+05:30
34	1	LOGIN_SUCCESS	User	1	::1	{"sessionId": "27", "legacyPassword": false, "mustChangePassword": false}	2026-11-12 10:58:54.329+05:30
35	\N	TOKEN_REFRESHED	Session	28	::1	{"previousSessionId": "27"}	2026-11-12 11:14:09.495+05:30
36	\N	TOKEN_REFRESHED	Session	29	::1	{"previousSessionId": "28"}	2026-11-12 11:37:25.217+05:30
37	\N	TOKEN_REFRESHED	Session	30	::1	{"previousSessionId": "29"}	2026-11-12 12:15:43.049+05:30
38	\N	TOKEN_REFRESHED	Session	31	::1	{"previousSessionId": "30"}	2026-11-12 12:31:12.914+05:30
39	1	LOGOUT	Session	31	::1	{}	2026-11-12 12:34:02.218+05:30
40	1	LOGIN_SUCCESS	User	1	::1	{"sessionId": "32", "legacyPassword": false, "mustChangePassword": false}	2026-11-12 12:34:06.203+05:30
41	1	LOGIN_SUCCESS	User	1	::1	{"sessionId": "33", "legacyPassword": false, "mustChangePassword": false}	2026-11-12 15:59:11.631+05:30
42	\N	TOKEN_REFRESHED	Session	34	::1	{"previousSessionId": "33"}	2026-11-12 16:19:04.817+05:30
43	\N	TOKEN_REFRESHED	Session	35	::1	{"previousSessionId": "34"}	2026-11-12 17:09:42.728+05:30
44	\N	TOKEN_REFRESHED	Session	36	::1	{"previousSessionId": "35"}	2026-11-12 17:51:47.336+05:30
45	\N	TOKEN_REFRESHED	Session	37	::1	{"previousSessionId": "36"}	2026-11-12 18:42:29.134+05:30
46	\N	LOGIN_FAILED	\N	\N	::1	{"reason": "unknown_user", "username": "nonexistent_probe_user"}	2026-11-13 06:44:04.036+05:30
47	1	LOGIN_SUCCESS	User	1	::1	{"sessionId": "38", "legacyPassword": false, "mustChangePassword": false}	2026-11-13 06:45:57.094+05:30
48	\N	TOKEN_REFRESHED	Session	39	::1	{"previousSessionId": "38"}	2026-11-13 08:50:32.897+05:30
49	\N	TOKEN_REFRESHED	Session	40	::1	{"previousSessionId": "39"}	2026-11-13 09:21:20.571+05:30
50	\N	TOKEN_REFRESHED	Session	41	::1	{"previousSessionId": "40"}	2026-11-13 12:19:28.168+05:30
51	\N	LOGIN_FAILED	\N	\N	::1	{"reason": "unknown_user", "username": "nonexistent_probe"}	2026-11-13 13:08:32.819+05:30
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bank_accounts (id, "profileId", "accountName", "accountNoEnc", "accountNoHash", "bankName", "isActive") FROM stdin;
\.


--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.countries (id, "isoCode", name, "currencyCode", "defaultTimezone", "defaultLanguage", "dateFormat", "isActive", "createdAt", "updatedAt") FROM stdin;
1	IN	India	INR	Asia/Kolkata	en	DD/MM/YYYY	t	2026-11-13 12:43:54.671+05:30	2026-11-13 13:05:56.339+05:30
2	AE	United Arab Emirates	AED	Asia/Dubai	en	DD/MM/YYYY	t	2026-11-13 12:43:54.682+05:30	2026-11-13 13:05:56.341+05:30
\.


--
-- Data for Name: custom_field_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_field_definitions (id, code, label, "tabKey", "sectionName", "fieldType", options, "countryCode", "isRequired", "isSensitive", "helpText", "isActive", "displayOrder", "createdByProfileId", "createdAt", placeholder) FROM stdin;
\.


--
-- Data for Name: custom_field_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_field_values (id, "employeeId", "definitionId", value, "updatedAt") FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (id, name, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: dependants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dependants (id, "dependantProfileId", "employeeProfileId", "relationTypeId") FROM stdin;
\.


--
-- Data for Name: document_field_values; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_field_values (id, "documentId", "fieldId", value, "valueEnc") FROM stdin;
\.


--
-- Data for Name: document_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_files (id, "documentId", "fileId", "fieldId", "isCurrent", "uploadedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: document_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_types (id, name, "isActive") FROM stdin;
1	Passport	t
2	Work Permit	t
3	Emirates Id	t
4	Health Insurance	t
5	Trade License	t
6	Driving License	t
106	nol	t
107	Visa	t
108	Traffic Fine	t
109	Warning Letter	t
110	Accident Document	t
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, "documentTypeId", "profileId", "issueDate", "expiryDate", "identityNoEnc", "identityNoHash", "documentTitle", remarks, "isActive", "isSelf", "companyId", "createdAt", "createdById", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employee_profile_sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_profile_sections (id, "employeeId", "sectionKey", data, "updatedByProfileId", "updatedAt") FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (id, "profileId", "employeeCode", "reportingToId", "sourceOfHireId", "locationId", "siteId", "employeeStatusId", "employeeTypeId", "contractTypeId", "workPhone", extension, "workEmail", "dateOfJoining", "dateOfConfirmation", "personIdNumberEnc", "personIdNumberHash", designation, "shiftId", "isActive", "exitUploadId", "isWPSProcessing", "isSalaryProcessing", "isAttendanceProcessing", "companyMobileNo", "companyLandNo", "payrollSiteId", "isAllowedAdvanceLeave") FROM stdin;
\.


--
-- Data for Name: expiry_alert_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expiry_alert_logs (id, "documentId", "alertWindow", "sentAt", recipients, "runId") FROM stdin;
\.


--
-- Data for Name: form_entities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_entities (id, name, key, "legacyTableName", "legacyPrimaryKey", "displayOrder", "isActive") FROM stdin;
\.


--
-- Data for Name: form_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.form_fields (id, "entityId", "fieldName", "displayName", "dataTypeId", "isMandatory", "validationRegex", "isForeignKey", "foreignEntityId", "displayOrder", "isGridVisible", "documentTypeId", config) FROM stdin;
\.


--
-- Data for Name: holiday_calendar_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holiday_calendar_entries (id, "holidayListId", "profileId", date, "prevHolidayDate") FROM stdin;
\.


--
-- Data for Name: holiday_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.holiday_lists (id, name, "siteId", "isActive") FROM stdin;
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.languages (id, name, "isActive") FROM stdin;
1	English	t
2	Arabic	t
3	Hindi	t
4	Urdu	t
5	Malayalam	t
6	Tamil	t
7	Telugu	t
8	Kannada	t
9	Marathi	t
10	Bengali	t
11	Punjabi	t
12	Gujarati	t
13	Tagalog	t
14	Nepali	t
15	Sinhala	t
16	French	t
17	Persian	t
18	Pashto	t
19	Russian	t
20	Spanish	t
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, "parentId", name, "pageUrl", "iconClass", "displayOrder", "isMainMenu", "isActive") FROM stdin;
37	\N	Profile	\N	fa fa-book	1	t	t
155	\N	Profile	\N	\N	2	t	t
2	\N	Master Setup	\N	fa fa-cogs	2	t	t
1	37	Employee List	/profilelist	fa fa-users	1	t	t
12	37	Document List	/documentlist	fa fa-folder-open-o	2	t	t
156	37	My Profile	/myprofile	fa fa-user-secret	3	t	t
3	2	Language	\N	\N	1	f	t
4	2	Role	\N	\N	2	f	t
6	2	Department	\N	\N	3	f	t
7	2	Site	\N	\N	4	f	t
21	2	Document Type	\N	\N	5	f	t
146	155	Basic & Work Details	\N	\N	1	f	t
147	155	Document	\N	\N	2	f	t
151	155	Dependants	\N	\N	3	f	t
\.


--
-- Data for Name: menu_user_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_user_overrides (id, "userId", "menuItemId", "isInclude", "pageUrlOverride") FROM stdin;
\.


--
-- Data for Name: menu_user_type_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_user_type_permissions (id, "userTypeId", "menuItemId", "pageUrlOverride", "isCreate", "isEdit", "isDelete") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, code, text, "shortDesc", "messageTypeId", "displayOrder") FROM stdin;
2	INVALID_CREDENTIALS	Incorrect username and/or password. Please try again or click on Forgot Password to create a new password	Invalid Login	7	1
4	OK	Data retrieved successfully	Success Message	9	2
5	UPDATED	Data Updated Successfully	Records Update successfully	9	3
6	EMAIL_EXISTS	EmailId already exists	User Setup	7	4
7	EMPLOYEE_CODE_EXISTS	Employee code already exists.	Employee code	7	5
8	EMAIL_SENT	Email send Succesfully	Email Send	9	6
9	FILE_DOWNLOADED	File downloaded Successfully	File Download	9	7
10	HOLIDAY_EXISTS	Holiday Detail Already Exist	Holiday Details	7	8
11	WEEKLY_OFF_EXISTS	WOF List Already Exist	WeekilyConfig	7	9
12	SITE_YEAR_EXISTS	Site Already Exist for this year	WeekilyConfig	7	10
19	FILE_UPLOADED	File upload successfully	File Upload	9	11
20	MANDATORY_FIELDS_MISSING	Mandatory fields are not present	File Upload	7	12
23	COLUMN_MISSING	Column is missing {{0}}	Column Missing	7	13
24	INVALID_DATA	Invalid data	Invalid data	7	14
25	MANDATORY_MISSING	Mandatory fields missing	Mandatory	7	15
28	SHIFT_EXISTS	Shift Name Already Exists	Shift Master	7	16
30	INCORRECT_PASSWORD	Incorrect password	Payroll	7	17
\.


--
-- Data for Name: module_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.module_configurations (id, "moduleKey", name, "isEnabled", "isImplemented", "dependsOn", "displayOrder", "updatedByProfileId", "updatedAt") FROM stdin;
1	user-management	User Management	t	t	{}	1	\N	2026-11-13 13:05:56.346+05:30
2	employee-management	Employee Management	t	t	{user-management}	2	\N	2026-11-13 13:05:56.351+05:30
3	document-management	Document Management	t	t	{employee-management}	3	\N	2026-11-13 13:05:56.354+05:30
4	leave-management	Leave Management	f	f	{employee-management}	4	\N	2026-11-13 13:05:56.355+05:30
5	attendance-management	Attendance Management	f	f	{employee-management}	5	\N	2026-11-13 13:05:56.356+05:30
6	payroll-management	Payroll Management	f	f	{employee-management,attendance-management}	6	\N	2026-11-13 13:05:56.358+05:30
7	leave-salary	Leave Salary	f	f	{leave-management,payroll-management}	7	\N	2026-11-13 13:05:56.36+05:30
8	full-final-settlement	Full & Final Settlement	f	f	{payroll-management}	8	\N	2026-11-13 13:05:56.362+05:30
9	onboarding	Onboarding	f	f	{employee-management}	9	\N	2026-11-13 13:05:56.363+05:30
10	performance-management	Performance Management	f	f	{employee-management}	10	\N	2026-11-13 13:05:56.365+05:30
\.


--
-- Data for Name: one_time_login_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.one_time_login_tokens (id, "userId", "tokenHash", "createdAt", "expiresAt", "usedAt", "usedIp") FROM stdin;
\.


--
-- Data for Name: parameter_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parameter_types (id, name) FROM stdin;
1	User Type
2	User Status
3	Log Type
4	Message Type
5	Data Type
6	Field Data Type
8	Passport Type
9	Marital Status
10	Gender
11	BloodGroup
12	Source of hire
13	Location
14	Employee Type
15	Dependant Relation
17	ExitReason
18	Date Range
19	Nationality
20	Employee Status
21	Contract Type
22	Visa Type
\.


--
-- Data for Name: parameters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parameters (id, "parameterTypeId", text, "parameterValue", "displayOrder", "isVisible", code) FROM stdin;
45	11	AB-	8	8	t	\N
46	12	Direct	1	1	t	\N
47	12	Referral	2	2	t	\N
48	12	Web	3	3	t	\N
49	12	Newspaper	4	4	t	\N
50	12	Advertisement	5	5	t	\N
51	13	Dubai	1	1	t	\N
53	13	AbuDhabi	2	2	t	\N
192	13	Nepal	3	3	t	\N
191	13	India	4	4	t	\N
55	14	Permanent	1	1	t	\N
57	14	On Contract	2	2	t	\N
58	14	Temporary	3	3	t	\N
59	14	Intern	4	4	t	\N
62	15	Wife	1	1	t	\N
63	15	Son	2	2	t	\N
64	15	Daughter	3	3	t	\N
66	15	Parent	4	4	t	\N
129	15	Husband	5	5	t	\N
69	17	Terminated	1	1	t	\N
70	17	Resigned	2	2	t	\N
71	17	Absconded	3	3	t	\N
98	17	Other	4	4	f	\N
73	18	7 Days	7	1	t	\N
74	18	14 days	14	2	t	\N
75	18	30 Days	30	3	t	\N
76	18	60 Days	60	4	t	\N
137	18	90 Days	90	5	t	\N
138	18	More than 90 Days	91	6	t	\N
200	19	Indian	1	1	t	\N
201	19	Pakistani	2	2	t	\N
202	19	Filipino	3	3	t	\N
1901	19	American	101	11	t	\N
1902	19	Australian	102	12	t	\N
1903	19	Bahraini	103	13	t	\N
1904	19	Bangladeshi	104	14	t	\N
1905	19	British	105	15	t	\N
1906	19	Canadian	106	16	t	\N
1907	19	Chinese	107	17	t	\N
1908	19	Egyptian	108	18	t	\N
1909	19	Ethiopian	109	19	t	\N
1910	19	French	110	20	t	\N
1911	19	German	111	21	t	\N
1912	19	Iranian	112	22	t	\N
1913	19	Iraqi	113	23	t	\N
1914	19	Italian	114	24	t	\N
1915	19	Jordanian	115	25	t	\N
1916	19	Kenyan	116	26	t	\N
1917	19	Kuwaiti	117	27	t	\N
1918	19	Lebanese	118	28	t	\N
1919	19	Moroccan	119	29	t	\N
1920	19	Nepali	120	30	t	\N
1921	19	Nigerian	121	31	t	\N
1922	19	Omani	122	32	t	\N
1923	19	Qatari	123	33	t	\N
1924	19	Russian	124	34	t	\N
1925	19	Saudi	125	35	t	\N
1926	19	South African	126	36	t	\N
1927	19	Sri Lankan	127	37	t	\N
1928	19	Sudanese	128	38	t	\N
1929	19	Syrian	129	39	t	\N
1930	19	Tunisian	130	40	t	\N
1931	19	Ugandan	131	41	t	\N
1932	19	Yemeni	132	42	t	\N
5	2	Inactive	2	2	t	inactive
6	3	Login	1	1	t	login
7	4	Error	1	1	t	error
8	4	Warning	2	2	t	warning
9	4	Success	3	3	t	success
99	5	int	1	1	t	\N
100	5	range	2	2	t	\N
101	5	multiselect	3	3	t	\N
102	5	singleselect	4	4	t	\N
103	5	string	5	5	t	\N
173	5	Year	6	6	t	\N
174	5	Month	7	7	t	\N
14	6	string	1	1	t	\N
15	6	password	2	2	t	\N
16	6	bit	3	3	t	\N
17	6	date	4	4	t	\N
19	6	byte	5	5	t	\N
20	6	int	6	6	t	\N
23	6	upload	7	7	t	\N
26	6	singleselect	8	8	t	\N
30	6	multiselect	9	9	t	\N
31	6	Text	10	10	t	\N
27	8	Regular	1	1	t	\N
28	8	Emergency	2	2	f	\N
29	8	Diplomatic	3	3	f	\N
24	9	Single	1	1	t	\N
25	9	Married	2	2	t	\N
33	10	Female	1	1	t	\N
34	10	Male	2	2	t	\N
35	10	Other	3	3	t	\N
37	11	A+	1	1	t	\N
38	11	A-	2	2	t	\N
39	11	B+	3	3	t	\N
40	11	B-	4	4	t	\N
42	11	O+	5	5	t	\N
43	11	O-	6	6	t	\N
44	11	AB+	7	7	t	\N
1900	19	Afghan	100	10	t	\N
212	20	Suspended	3	3	t	\N
4	2	Active	1	1	t	active
203	19	Emirati	4	4	t	\N
2	1	Internal	1	1	t	internal
3	1	External	2	2	t	external
213	20	Terminated	4	4	t	\N
220	21	Full Time	1	1	t	\N
221	21	Part Time	2	2	t	\N
222	21	Contract	3	3	t	\N
223	21	Internship	4	4	t	\N
230	22	Employment	1	1	t	\N
231	22	Residence	2	2	t	\N
232	22	Visit	3	3	t	\N
233	22	Tourist	4	4	t	\N
204	19	Other	5	999	t	\N
210	20	Active	1	1	t	\N
211	20	On Leave	2	2	t	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, "userId", "tokenHash", "createdAt", "expiresAt", "usedAt", "requestedIp", "usedIp") FROM stdin;
\.


--
-- Data for Name: profile_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile_departments ("profileId", "departmentId") FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profiles (id, "userTypeId", "statusId", "customerId", name, "middleName", "lastName", email, "contactNo", "dateOfBirth", "maritalStatusId", "genderId", "motherTongueId", "bloodGroupId", "nationalityId", "visaTypeId", "photoFileId", address, "linkId", "isSiteAccess", qualification, "homeCountryAddress", "homeCountryPhoneNo", "contractTypeId", "dateOfExit", "exitReasonCode", "exitRemarks", "dateOfRejoining", "passportNoEnc", "passportNoHash", "emiratesIdEnc", "emiratesIdHash", "molNoEnc", "molNoHash", "visaNoEnc", "visaNoHash", "createdAt", "createdById", "updatedAt") FROM stdin;
1	\N	\N	\N	System	\N	Admin	admin@localhost	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-29 18:25:04.601+05:30	\N	2026-10-29 18:25:04.601+05:30
2	\N	\N	\N	Sayed	\N	Mohsin	mohsin.sayed@emqube.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-11-02 11:00:16.032+05:30	\N	2026-11-02 11:00:16.032+05:30
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, "isActive") FROM stdin;
1	Admin	t
2	Manager	t
3	Employee	t
\.


--
-- Data for Name: salary_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_templates (id, name, "countryCode", components, "isActive", "createdByProfileId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, "userId", "refreshTokenHash", "issuedAt", "expiresAt", "lastUsedAt", "rotatedAt", "revokedAt", "revokedReason", "ipAddress", "userAgent", "familyId", "familyStartedAt") FROM stdin;
1	1	fcfa7dc368614ea064d7c0dc553bff3e1dc7cc8462c51d07d284b26ed4fa94f0	2026-10-29 18:25:15.373+05:30	2026-11-12 18:25:15.368+05:30	2026-10-29 18:25:15.368+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.9711	366cbe91-2f6c-4548-8bb8-7c3634e214c8	2026-10-29 18:25:15.373+05:30
2	1	71698344043c57540123aa151056f192d83fec87b42fe487894d32f40bf5a7dd	2026-10-29 18:26:00.292+05:30	2026-11-12 18:26:00.287+05:30	2026-10-29 18:26:00.287+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT; Windows NT 10.0; en-US) WindowsPowerShell/5.1.26100.9711	93dbb566-ad56-48de-8c50-283a93476ac0	2026-10-29 18:26:00.292+05:30
3	1	219e43be1819930f0554c5456ccfb67b3a057849a004337daaa4cb7754d57682	2026-10-29 18:51:58.168+05:30	2026-11-12 18:51:58.165+05:30	2026-10-29 18:51:58.166+05:30	\N	2026-10-29 19:01:59.314+05:30	logout	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	edaecc79-0969-4594-b90a-1793217529e0	2026-10-29 18:51:58.168+05:30
4	1	c30bee06c5933c3904bf646037dbfc3ca103bfc93753ec5262cb3d75e851ae53	2026-10-29 19:02:13.855+05:30	2026-11-12 19:02:13.853+05:30	2026-10-29 19:17:23.864+05:30	2026-10-29 19:17:23.864+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	0bb92760-6df3-4c4a-b0bb-f539a85eed25	2026-10-29 19:02:13.855+05:30
7	1	d37fef6987389480791b936ab0c8dd9d8ac584f55ce18540eb3a3eccbca99331	2026-10-29 19:20:51.374+05:30	2026-11-12 19:20:51.371+05:30	2026-10-29 19:20:51.371+05:30	\N	\N	\N	::ffff:127.0.0.1	curl/8.21.0	a1d3fead-d179-4107-b6f3-9a6ce52a7dea	2026-10-29 19:20:51.374+05:30
8	1	6b2509f129b1ab02bd1df29c2447675a1b91a6bceab942003813fe1ca9f7169e	2026-10-29 19:21:57.862+05:30	2026-11-12 19:21:57.852+05:30	2026-10-29 19:21:57.852+05:30	\N	\N	\N	::ffff:127.0.0.1	opencode/latest/2.2.0/cli	e1875b6e-5f2f-4f44-88a9-64a635ff0756	2026-10-29 19:21:57.862+05:30
6	1	7113feca613f0e5dfea6d0d06fe5c911e4d9eeab5e918c326c621c668dd36f0a	2026-10-29 19:18:42.596+05:30	2026-11-12 19:18:42.593+05:30	2026-10-30 10:32:24.573+05:30	2026-10-30 10:32:24.573+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OpenCode/2.2.0 Chrome/152.0.7977.167 Electron/44.9.1 Safari/537.36	e574261a-7be8-4266-962d-f064011d159e	2026-10-29 19:18:42.596+05:30
5	1	9dd0dcb86ec1d91cba19b94a9c4994e6972d3888826734e4c2b185b4070ff1f8	2026-10-29 19:17:23.88+05:30	2026-11-12 19:17:23.874+05:30	2026-10-30 10:32:32.092+05:30	2026-10-30 10:32:32.092+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	2a1158e3-6a86-4308-a3ff-9c4dfee0bb9e	2026-10-29 19:17:23.88+05:30
10	1	5bde6a5dc33b9d85558102bad738bfe694e5f42238370a472401d08b51b4e974	2026-10-30 10:32:32.122+05:30	2026-11-13 10:32:32.12+05:30	2026-10-30 10:32:32.12+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	4e83c403-e426-4c77-b5be-c026daa0c1c5	2026-10-30 10:32:32.122+05:30
11	1	99eb18bae733593a6d6355c7041ece4ca2132ac02537e003b7afbf1bda77b63d	2026-10-30 10:37:30.631+05:30	2026-11-13 10:37:30.628+05:30	2026-10-30 11:04:30.266+05:30	2026-10-30 11:04:30.266+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	d85e437a-0507-4708-9f28-485698894f98	2026-10-30 10:37:30.631+05:30
12	1	49a01ced067ea04bf6733db26579a9bfa4442caa6e3acb5e5aed9a0b67bd09fc	2026-10-30 11:04:30.327+05:30	2026-11-13 11:04:30.32+05:30	2026-10-30 11:20:53.649+05:30	2026-10-30 11:20:53.649+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	7e1f6df8-e022-4bb3-90c1-566eb87021ff	2026-10-30 11:04:30.327+05:30
13	1	b57663afbef63d715362df2b32a9d1501dc61e8dce0e4f43d8a57b61de0f2fc9	2026-10-30 11:20:53.706+05:30	2026-11-13 11:20:53.702+05:30	2026-10-30 11:20:53.702+05:30	\N	2026-10-30 11:27:40.176+05:30	logout	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	adbc1bed-0674-4b4e-a806-d581d556bf65	2026-10-30 11:20:53.706+05:30
9	1	c7fc1dbd0ebbcc5ca7e3bf473d3ab0f4d74ed1d53cafa5b1ea47e82598f12344	2026-10-30 10:32:24.602+05:30	2026-11-13 10:32:24.599+05:30	2026-10-30 11:39:42.125+05:30	2026-10-30 11:39:42.125+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OpenCode/2.2.0 Chrome/152.0.7977.167 Electron/44.9.1 Safari/537.36	fa9fc554-a6b5-4737-a06c-628ed602596f	2026-10-30 10:32:24.602+05:30
15	1	585d072c5bc5e1cfbc14248b5118f2110e0aa77fa41087be8887bd072efdc4d9	2026-10-30 11:39:42.191+05:30	2026-11-13 11:39:42.184+05:30	2026-10-30 11:39:42.184+05:30	\N	2026-10-30 11:39:45.456+05:30	logout	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OpenCode/2.2.0 Chrome/152.0.7977.167 Electron/44.9.1 Safari/537.36	6ddd69d2-df24-40bf-9546-9132431db750	2026-10-30 11:39:42.191+05:30
16	1	6924e260aa04d6475d2798663c47adb0dc6baa08c8601fb119ad5870551a8908	2026-10-30 11:40:18.91+05:30	2026-11-13 11:40:18.905+05:30	2026-10-30 11:40:18.905+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OpenCode/2.2.0 Chrome/152.0.7977.167 Electron/44.9.1 Safari/537.36	51e26488-a603-42d7-ac47-3fb52919942c	2026-10-30 11:40:18.91+05:30
17	1	3f2d4b95666bebbc65c82c0ea799b36fa2dd13acdbde7eca39563251883d9732	2026-10-30 11:40:52.459+05:30	2026-11-13 11:40:52.455+05:30	2026-10-30 11:40:52.455+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) OpenCode/2.2.0 Chrome/152.0.7977.167 Electron/44.9.1 Safari/537.36	3ecc4269-0449-43e6-953d-54b86df305bd	2026-10-30 11:40:52.459+05:30
14	1	bff29322dbb379e8a94560d519fe6ba32107f861ac8c3a3eb086d8884c1a7fbe	2026-10-30 11:31:40.846+05:30	2026-11-13 11:31:40.842+05:30	2026-10-30 11:31:40.842+05:30	\N	2026-10-30 11:42:09.323+05:30	logout	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	b6b86a03-ace1-4b79-ab92-79aac325e6bf	2026-10-30 11:31:40.846+05:30
18	1	cb484e3b1a8053fc0de9972a6f1beca9c4a5afbbe43cfa70cbf144685c43cf1b	2026-10-30 12:17:59.859+05:30	2026-11-13 12:17:59.853+05:30	2026-10-30 12:17:59.854+05:30	\N	2026-10-30 12:25:46.262+05:30	logout	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	85eef5e6-6490-4114-971e-bc3929c37509	2026-10-30 12:17:59.859+05:30
19	1	4b0ba5e1e1af50ec3a6a61ef2f95649bb5c896e8dbe98b7f219c0de935932ad9	2026-10-30 12:42:48.903+05:30	2026-11-13 12:42:48.9+05:30	2026-10-30 14:15:43.595+05:30	2026-10-30 14:15:43.595+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	bd460dac-4995-4399-818b-7c75c1a785aa	2026-10-30 12:42:48.903+05:30
20	1	d34f8e1a803fb5c79716da3ecb364e3fcdf9e6cbd52d26292fe61f44d0105f82	2026-10-30 14:15:43.664+05:30	2026-11-13 14:15:43.649+05:30	2026-10-30 15:04:18.828+05:30	2026-10-30 15:04:18.828+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	f37d1674-bcf0-4f26-bec0-db9cad5c473b	2026-10-30 14:15:43.664+05:30
21	1	392e6d98d8a6af00df3640d531b77c00e393be4b2f6980d72134f2ab523222aa	2026-10-30 15:04:18.854+05:30	2026-11-13 15:04:18.85+05:30	2026-10-30 19:04:35.857+05:30	2026-10-30 19:04:35.857+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	f7545694-87cd-420b-9073-a346b1756bcf	2026-10-30 15:04:18.854+05:30
22	1	179c5443d7882e375b0f9928d18aee64f6d0528224dd1b6de9d361353a0fcc0c	2026-10-30 19:04:35.884+05:30	2026-11-13 19:04:35.88+05:30	2026-10-30 19:04:35.88+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	5b329faf-ff98-4114-9641-e70653391495	2026-10-30 19:04:35.884+05:30
23	1	67376b096c180f6ff6084994e435441a37e6ad28cfc5b4d09ff1fd135b8b8748	2026-11-02 10:50:34.623+05:30	2026-11-16 10:50:34.62+05:30	2026-11-02 16:37:47.253+05:30	2026-11-02 16:37:47.253+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	9befb4cc-41a9-47d2-a721-5777ed2c4e0c	2026-11-02 10:50:34.623+05:30
24	1	2e03f78f3e4eab1adfb1e76694670941a328d57e6849c161a6d801e420a5567c	2026-11-02 16:37:47.274+05:30	2026-11-16 16:37:47.27+05:30	2026-11-02 16:52:47.205+05:30	2026-11-02 16:52:47.205+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	75420fdd-83d6-4d60-9923-6aa7dd4b290a	2026-11-02 16:37:47.274+05:30
25	1	b80c237fd05980deb35197f1600c5f0e6e77dc9e778b951f336fd4f03480cbd4	2026-11-02 16:52:47.259+05:30	2026-11-16 16:52:47.255+05:30	2026-11-02 17:12:33.304+05:30	2026-11-02 17:12:33.304+05:30	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	df5cea9c-40ea-47a2-8a2c-2a6444a8e05c	2026-11-02 16:52:47.259+05:30
26	1	b5596f5cf109fd5c170e993de4a5eb6730c6cdeec266fadd474e8849dd4c2687	2026-11-02 17:12:33.328+05:30	2026-11-16 17:12:33.325+05:30	2026-11-02 17:12:33.326+05:30	\N	\N	\N	::ffff:127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36	26178db8-a02b-4765-9b73-717555b6241a	2026-11-02 17:12:33.328+05:30
27	1	d490336e645019757bc9200fd6ae403c46c6c9d554ac3dd373e4916852dd28ef	2026-11-12 10:58:54.3+05:30	2026-11-12 14:12:30.519+05:30	2026-11-12 11:14:09.467+05:30	2026-11-12 11:14:09.467+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	5c1ac0f0-6db2-4c7e-8994-9762259d860e	2026-11-12 10:58:54.3+05:30
28	1	9eedb85cbe9b43d3a05c99004672317bf3b2229a46dc04c58300aab9529602f9	2026-11-12 11:14:09.48+05:30	2026-11-12 14:19:12.858+05:30	2026-11-12 11:37:25.186+05:30	2026-11-12 11:37:25.186+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	5c1ac0f0-6db2-4c7e-8994-9762259d860e	2026-11-12 10:58:54.3+05:30
29	1	d09261cd708ddbdbbfbd122b1577a850b36d89191215be07e2581e2a022fcecf	2026-11-12 11:37:25.207+05:30	2026-11-12 14:45:03.928+05:30	2026-11-12 12:15:42.95+05:30	2026-11-12 12:15:42.95+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	5c1ac0f0-6db2-4c7e-8994-9762259d860e	2026-11-12 10:58:54.3+05:30
30	1	63c84163e7235fa10ec44ba440a8fb3b357f0a1855127f3df990ce8843e43072	2026-11-12 12:15:43.016+05:30	2026-11-12 15:30:28.683+05:30	2026-11-12 12:31:12.838+05:30	2026-11-12 12:31:12.838+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	5c1ac0f0-6db2-4c7e-8994-9762259d860e	2026-11-12 10:58:54.3+05:30
31	1	9152b0ba97f96426505bd02389d8092f8375fd35a412134f251a304c17da5bed	2026-11-12 12:31:12.894+05:30	2026-11-12 15:31:12.894+05:30	2026-11-12 12:31:12.894+05:30	\N	2026-11-12 12:34:02.168+05:30	logout	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	5c1ac0f0-6db2-4c7e-8994-9762259d860e	2026-11-12 10:58:54.3+05:30
32	1	fd55395529b87e6f06128610883e364ef3f1eed2a9630d3c517a9c339234c194	2026-11-12 12:34:06.195+05:30	2026-11-12 15:34:06.195+05:30	2026-11-12 12:34:06.195+05:30	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	ce18cc5a-dce1-489f-b7b2-e135df7abd93	2026-11-12 12:34:06.195+05:30
33	1	238b83cea2152ab9114aacf5480bb1b33f139585310f278b2b8f9522d1022345	2026-11-12 15:59:11.599+05:30	2026-11-12 19:09:18.416+05:30	2026-11-12 16:19:04.768+05:30	2026-11-12 16:19:04.768+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	0961f011-a358-4a78-9fa8-abe2cbc5924d	2026-11-12 15:59:11.599+05:30
34	1	2169b98a3d1f8c4637ef924646502a4a879de270857d034fca9ac2c74b4e45c3	2026-11-12 16:19:04.806+05:30	2026-11-12 19:25:47.322+05:30	2026-11-12 17:09:42.679+05:30	2026-11-12 17:09:42.679+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	0961f011-a358-4a78-9fa8-abe2cbc5924d	2026-11-12 15:59:11.599+05:30
35	1	9de6e2c44cca3b31a8fc255a0c6cffecc7062c8ec1dd1960e66debb50de09810	2026-11-12 17:09:42.713+05:30	2026-11-12 20:09:42.713+05:30	2026-11-12 17:51:47.314+05:30	2026-11-12 17:51:47.314+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	0961f011-a358-4a78-9fa8-abe2cbc5924d	2026-11-12 15:59:11.599+05:30
36	1	a3a794b6ee0cc36947acbc457c508f0c180208cf4a0e98257dc88a931dec51a6	2026-11-12 17:51:47.33+05:30	2026-11-12 20:51:47.33+05:30	2026-11-12 18:42:29.054+05:30	2026-11-12 18:42:29.054+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	0961f011-a358-4a78-9fa8-abe2cbc5924d	2026-11-12 15:59:11.599+05:30
37	1	d96738c879c6ebe0b7c2c2cbd3fd16acff7dc737b2d5e94c2a07359822794af7	2026-11-12 18:42:29.103+05:30	2026-11-12 21:42:29.103+05:30	2026-11-12 18:42:29.103+05:30	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	0961f011-a358-4a78-9fa8-abe2cbc5924d	2026-11-12 15:59:11.599+05:30
38	1	0b7157964d8e7feb8d8bc7f17f2b04d010e800ffe0038c1f9a4a17ff97c86622	2026-11-13 06:45:57.057+05:30	2026-11-13 09:45:57.057+05:30	2026-11-13 08:50:32.813+05:30	2026-11-13 08:50:32.813+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	1f299376-d205-4bfa-b642-de582e1e2b15	2026-11-13 06:45:57.057+05:30
39	1	f38668c8a97ac513f81b497592111338dc1c44149104376fb4d76ec6965773c1	2026-11-13 08:50:32.886+05:30	2026-11-13 11:50:32.886+05:30	2026-11-13 09:21:20.432+05:30	2026-11-13 09:21:20.432+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	1f299376-d205-4bfa-b642-de582e1e2b15	2026-11-13 06:45:57.057+05:30
40	1	ca3f35032885022a54d64028602170a0f97623aa46fa4129fa3c169ac55964cf	2026-11-13 09:21:20.56+05:30	2026-11-13 12:21:20.56+05:30	2026-11-13 12:19:28.068+05:30	2026-11-13 12:19:28.068+05:30	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	1f299376-d205-4bfa-b642-de582e1e2b15	2026-11-13 06:45:57.057+05:30
41	1	cffd97423027327fa1b727e4b09bd2e45475497a6e555143b0a8f11f9a12c9e2	2026-11-13 12:19:28.15+05:30	2026-11-13 15:19:28.15+05:30	2026-11-13 12:19:28.15+05:30	\N	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36	1f299376-d205-4bfa-b642-de582e1e2b15	2026-11-13 06:45:57.057+05:30
\.


--
-- Data for Name: shifts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shifts (id, name, "startTime", "endTime", "lateMinutes", "halfDayMinutes", "altStartTime", "altEndTime", "isActive", "createdAt", "createdById", "updatedAt") FROM stdin;
1	General	09:00:00	18:00:00	15	240	\N	\N	t	2026-11-13 12:18:44.98+05:30	\N	2026-11-13 12:18:44.98+05:30
2	Morning	06:00:00	15:00:00	15	240	\N	\N	t	2026-11-13 12:18:44.988+05:30	\N	2026-11-13 12:18:44.988+05:30
3	Evening	14:00:00	23:00:00	15	240	\N	\N	t	2026-11-13 12:18:44.99+05:30	\N	2026-11-13 12:18:44.99+05:30
4	Night	22:00:00	07:00:00	15	240	\N	\N	t	2026-11-13 12:18:44.993+05:30	\N	2026-11-13 12:18:44.993+05:30
\.


--
-- Data for Name: sites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sites (id, name, "isActive") FROM stdin;
1	Dubai Head Office	t
2	Abudhabi	t
3	Nepal	t
4	India	t
\.


--
-- Data for Name: stored_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stored_files (id, "originalName", "legacyFolderPath", "storageKey", "mimeType", "sizeBytes", sha256, "fileTypeId", "createdById", "createdAt", "isActive") FROM stdin;
\.


--
-- Data for Name: system_configurations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_configurations (id, name, value, "valueDate", "valueKind", description) FROM stdin;
26	Default Country	AE	\N	string	Default country for new employees/organizations
27	Default Timezone	Asia/Dubai	\N	string	Default timezone for display and local-date calculations
28	Default Language	en	\N	string	Default UI language
29	Default Date Format	DD/MM/YYYY	\N	string	Default date display format
30	Default Time Format	24	\N	string	Default time display format: 12 or 24
31	Default Currency	AED	\N	string	Default currency code
32	Number Format	1,234.56	\N	string	Default number formatting example
33	Max Failed Login Attempts	5	\N	number	Failed logins before an account is locked
34	Account Lockout Minutes	30	\N	number	How long a locked account stays locked
35	Session Timeout Minutes	180	\N	number	Idle minutes before a login session expires
1	CompOff Leave Expiry	90	\N	number	Days after which comp-off leave expires
2	CompOff Request Expiry	30	\N	number	Days after which comp-off request expires
3	AnnualLeave Exception Months	0	\N	number	Annual leave exception months
4	CompOffAvail Exception days	5,6,7	\N	string	Days on which comp-off can be availed
5	WeekOffdays for Operation	1	\N	number	Weekly off days for operations
6	HalfDay Min work hours	0	\N	number	Minimum work hours for half day
7	Full Day Min work hours	8	\N	number	Minimum work hours for full day
8	Break Time In Min-Upload	30	\N	number	Break time in minutes for upload
9	Break Time In Min-ERP	30	\N	number	Break time in minutes for ERP
10	Attendance Sync Date	1	\N	number	Attendance sync date
11	PayrollMonth	6	\N	number	Payroll month
12	IsHrAdminAvailable	1	\N	number	Is HR admin available
14	OTRequired	1	\N	number	OT required
15	LeaveEncashment	1	\N	number	Leave encashment enabled
16	GratuityDate	2000-01-01	\N	date	Gratuity date
17	CompOffAvail Exception days Site1	5,6	\N	string	Comp-off availing exception days for site 1
18	CompOffAvail Exception days Site2	6,7	\N	string	Comp-off availing exception days for site 2
19	Family Airfare required	1	\N	number	Family airfare required
20	MaxNoOfFamilyMembers	4	\N	number	Maximum number of family members
21	Deduction Perccentage	20	\N	number	Deduction percentage
22	Full day work minutes	480	\N	number	Full day work minutes
23	Minimum days to apply sandwitch rule	2	\N	number	Minimum days to apply sandwich rule
24	RamadanDates	2026-02-18	2026-03-19	date	Ramadan end date
25	Annual Leave Validation	0	\N	number	Annual leave validation
\.


--
-- Data for Name: user_activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_activities (id, "userId", "lastLoginAt", "lastIpUsed", "passwordChangedAt", "isPasswordReset", "failedLoginAttempts", "isLocked", "failedLoginAttemptAt", "lockedUntil") FROM stdin;
1	1	2026-11-13 06:45:55.808+05:30	::1	\N	f	0	f	\N	\N
\.


--
-- Data for Name: user_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_types (id, name, "isActive", "displayOrder") FROM stdin;
1	Executive	t	1
2	Manager	t	2
3	SystemAdmin	t	3
4	HRAdmin	t	4
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, "profileId", "userTypeId", username, "passwordHash", "legacyPasswordEnc", "mustChangePassword", "isActive", "createdAt", "updatedAt") FROM stdin;
1	1	3	admin	$2b$12$cXOME0eI9gYJriXBcXOj4OBoQIPAFpJ6R7KfMpX7.cHZdYSnxG5fu	\N	f	t	2026-10-29 18:25:04.923+05:30	2026-10-29 18:25:04.923+05:30
2	2	2	ea-262	$2b$12$/SohTOSskiWXivHNKhqeauY0N0MwF1DJn9PTA6JWbMPss1SsHQ8Fe	\N	f	t	2026-11-02 11:00:16.395+05:30	2026-11-02 16:57:10.778+05:30
\.


--
-- Data for Name: weekly_off_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_off_assignments (id, "profileId", "weeklyOffConfigId", year) FROM stdin;
\.


--
-- Data for Name: weekly_off_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_off_configs (id, name, "siteId", "daysOfWeek", year, "isActive") FROM stdin;
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 51, true);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bank_accounts_id_seq', 1, false);


--
-- Name: countries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.countries_id_seq', 6, true);


--
-- Name: custom_field_definitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_field_definitions_id_seq', 1, false);


--
-- Name: custom_field_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.custom_field_values_id_seq', 1, false);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 1, false);


--
-- Name: dependants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dependants_id_seq', 1, false);


--
-- Name: document_field_values_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_field_values_id_seq', 1, false);


--
-- Name: document_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_files_id_seq', 1, false);


--
-- Name: document_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_types_id_seq', 1, false);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- Name: employee_profile_sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_profile_sections_id_seq', 1, false);


--
-- Name: employees_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employees_id_seq', 1, false);


--
-- Name: expiry_alert_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expiry_alert_logs_id_seq', 1, false);


--
-- Name: form_entities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_entities_id_seq', 1, false);


--
-- Name: form_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.form_fields_id_seq', 1, false);


--
-- Name: holiday_calendar_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holiday_calendar_entries_id_seq', 1, false);


--
-- Name: holiday_lists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.holiday_lists_id_seq', 1, false);


--
-- Name: languages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.languages_id_seq', 20, true);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 1, false);


--
-- Name: menu_user_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_user_overrides_id_seq', 1, false);


--
-- Name: menu_user_type_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_user_type_permissions_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 1, false);


--
-- Name: module_configurations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.module_configurations_id_seq', 20, true);


--
-- Name: one_time_login_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.one_time_login_tokens_id_seq', 1, false);


--
-- Name: parameter_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parameter_types_id_seq', 1, false);


--
-- Name: parameters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.parameters_id_seq', 1, false);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


--
-- Name: profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profiles_id_seq', 2, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 1, false);


--
-- Name: salary_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_templates_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 41, true);


--
-- Name: shifts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shifts_id_seq', 4, true);


--
-- Name: sites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sites_id_seq', 4, true);


--
-- Name: stored_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stored_files_id_seq', 1, false);


--
-- Name: system_configurations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_configurations_id_seq', 1, false);


--
-- Name: user_activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_activities_id_seq', 18, true);


--
-- Name: user_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_types_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: weekly_off_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_off_assignments_id_seq', 1, false);


--
-- Name: weekly_off_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_off_configs_id_seq', 1, false);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: application_branding application_branding_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_branding
    ADD CONSTRAINT application_branding_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: custom_field_definitions custom_field_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_definitions
    ADD CONSTRAINT custom_field_definitions_pkey PRIMARY KEY (id);


--
-- Name: custom_field_values custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: dependants dependants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependants
    ADD CONSTRAINT dependants_pkey PRIMARY KEY (id);


--
-- Name: document_field_values document_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_field_values
    ADD CONSTRAINT document_field_values_pkey PRIMARY KEY (id);


--
-- Name: document_files document_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_files
    ADD CONSTRAINT document_files_pkey PRIMARY KEY (id);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employee_profile_sections employee_profile_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profile_sections
    ADD CONSTRAINT employee_profile_sections_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: expiry_alert_logs expiry_alert_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expiry_alert_logs
    ADD CONSTRAINT expiry_alert_logs_pkey PRIMARY KEY (id);


--
-- Name: form_entities form_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_entities
    ADD CONSTRAINT form_entities_pkey PRIMARY KEY (id);


--
-- Name: form_fields form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT form_fields_pkey PRIMARY KEY (id);


--
-- Name: holiday_calendar_entries holiday_calendar_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_calendar_entries
    ADD CONSTRAINT holiday_calendar_entries_pkey PRIMARY KEY (id);


--
-- Name: holiday_lists holiday_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_lists
    ADD CONSTRAINT holiday_lists_pkey PRIMARY KEY (id);


--
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_user_overrides menu_user_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_overrides
    ADD CONSTRAINT menu_user_overrides_pkey PRIMARY KEY (id);


--
-- Name: menu_user_type_permissions menu_user_type_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_type_permissions
    ADD CONSTRAINT menu_user_type_permissions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: module_configurations module_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_configurations
    ADD CONSTRAINT module_configurations_pkey PRIMARY KEY (id);


--
-- Name: one_time_login_tokens one_time_login_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.one_time_login_tokens
    ADD CONSTRAINT one_time_login_tokens_pkey PRIMARY KEY (id);


--
-- Name: parameter_types parameter_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parameter_types
    ADD CONSTRAINT parameter_types_pkey PRIMARY KEY (id);


--
-- Name: parameters parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parameters
    ADD CONSTRAINT parameters_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: profile_departments profile_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_departments
    ADD CONSTRAINT profile_departments_pkey PRIMARY KEY ("profileId", "departmentId");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: salary_templates salary_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_templates
    ADD CONSTRAINT salary_templates_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: sites sites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sites
    ADD CONSTRAINT sites_pkey PRIMARY KEY (id);


--
-- Name: stored_files stored_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT stored_files_pkey PRIMARY KEY (id);


--
-- Name: system_configurations system_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_configurations
    ADD CONSTRAINT system_configurations_pkey PRIMARY KEY (id);


--
-- Name: user_activities user_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_pkey PRIMARY KEY (id);


--
-- Name: user_types user_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_types
    ADD CONSTRAINT user_types_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: weekly_off_assignments weekly_off_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_assignments
    ADD CONSTRAINT weekly_off_assignments_pkey PRIMARY KEY (id);


--
-- Name: weekly_off_configs weekly_off_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_configs
    ADD CONSTRAINT weekly_off_configs_pkey PRIMARY KEY (id);


--
-- Name: activity_logs_logTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_logs_logTypeId_idx" ON public.activity_logs USING btree ("logTypeId");


--
-- Name: activity_logs_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_logs_userId_createdAt_idx" ON public.activity_logs USING btree ("userId", "createdAt");


--
-- Name: audit_logs_actorProfileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_actorProfileId_idx" ON public.audit_logs USING btree ("actorProfileId");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: bank_accounts_accountNoHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "bank_accounts_accountNoHash_idx" ON public.bank_accounts USING btree ("accountNoHash");


--
-- Name: bank_accounts_profileId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "bank_accounts_profileId_key" ON public.bank_accounts USING btree ("profileId");


--
-- Name: countries_isoCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "countries_isoCode_key" ON public.countries USING btree ("isoCode");


--
-- Name: custom_field_definitions_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX custom_field_definitions_code_key ON public.custom_field_definitions USING btree (code);


--
-- Name: custom_field_definitions_tabKey_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "custom_field_definitions_tabKey_idx" ON public.custom_field_definitions USING btree ("tabKey");


--
-- Name: custom_field_values_employeeId_definitionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "custom_field_values_employeeId_definitionId_key" ON public.custom_field_values USING btree ("employeeId", "definitionId");


--
-- Name: departments_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX departments_name_key ON public.departments USING btree (name);


--
-- Name: dependants_dependantProfileId_employeeProfileId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "dependants_dependantProfileId_employeeProfileId_key" ON public.dependants USING btree ("dependantProfileId", "employeeProfileId");


--
-- Name: document_field_values_documentId_fieldId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "document_field_values_documentId_fieldId_key" ON public.document_field_values USING btree ("documentId", "fieldId");


--
-- Name: document_files_documentId_fileId_fieldId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "document_files_documentId_fileId_fieldId_key" ON public.document_files USING btree ("documentId", "fileId", "fieldId");


--
-- Name: document_files_fileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "document_files_fileId_idx" ON public.document_files USING btree ("fileId");


--
-- Name: document_types_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX document_types_name_key ON public.document_types USING btree (name);


--
-- Name: documents_documentTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_documentTypeId_idx" ON public.documents USING btree ("documentTypeId");


--
-- Name: documents_expiryDate_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_expiryDate_isActive_idx" ON public.documents USING btree ("expiryDate", "isActive");


--
-- Name: documents_identityNoHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_identityNoHash_idx" ON public.documents USING btree ("identityNoHash");


--
-- Name: documents_profileId_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "documents_profileId_isActive_idx" ON public.documents USING btree ("profileId", "isActive");


--
-- Name: employee_profile_sections_employeeId_sectionKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employee_profile_sections_employeeId_sectionKey_key" ON public.employee_profile_sections USING btree ("employeeId", "sectionKey");


--
-- Name: employees_employeeCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employees_employeeCode_key" ON public.employees USING btree ("employeeCode");


--
-- Name: employees_personIdNumberHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "employees_personIdNumberHash_idx" ON public.employees USING btree ("personIdNumberHash");


--
-- Name: employees_profileId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "employees_profileId_key" ON public.employees USING btree ("profileId");


--
-- Name: employees_reportingToId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "employees_reportingToId_idx" ON public.employees USING btree ("reportingToId");


--
-- Name: employees_siteId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "employees_siteId_idx" ON public.employees USING btree ("siteId");


--
-- Name: expiry_alert_logs_documentId_alertWindow_runId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "expiry_alert_logs_documentId_alertWindow_runId_key" ON public.expiry_alert_logs USING btree ("documentId", "alertWindow", "runId");


--
-- Name: form_entities_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX form_entities_key_key ON public.form_entities USING btree (key);


--
-- Name: form_fields_entityId_fieldName_documentTypeId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "form_fields_entityId_fieldName_documentTypeId_key" ON public.form_fields USING btree ("entityId", "fieldName", "documentTypeId");


--
-- Name: form_fields_entityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "form_fields_entityId_idx" ON public.form_fields USING btree ("entityId");


--
-- Name: holiday_calendar_entries_profileId_holidayListId_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "holiday_calendar_entries_profileId_holidayListId_date_key" ON public.holiday_calendar_entries USING btree ("profileId", "holidayListId", date);


--
-- Name: languages_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX languages_name_key ON public.languages USING btree (name);


--
-- Name: menu_user_overrides_userId_menuItemId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "menu_user_overrides_userId_menuItemId_key" ON public.menu_user_overrides USING btree ("userId", "menuItemId");


--
-- Name: menu_user_type_permissions_userTypeId_menuItemId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "menu_user_type_permissions_userTypeId_menuItemId_key" ON public.menu_user_type_permissions USING btree ("userTypeId", "menuItemId");


--
-- Name: messages_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX messages_code_key ON public.messages USING btree (code);


--
-- Name: module_configurations_moduleKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "module_configurations_moduleKey_key" ON public.module_configurations USING btree ("moduleKey");


--
-- Name: one_time_login_tokens_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "one_time_login_tokens_tokenHash_key" ON public.one_time_login_tokens USING btree ("tokenHash");


--
-- Name: parameter_types_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX parameter_types_name_key ON public.parameter_types USING btree (name);


--
-- Name: parameters_parameterTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "parameters_parameterTypeId_idx" ON public.parameters USING btree ("parameterTypeId");


--
-- Name: parameters_parameterTypeId_text_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "parameters_parameterTypeId_text_key" ON public.parameters USING btree ("parameterTypeId", text);


--
-- Name: password_reset_tokens_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON public.password_reset_tokens USING btree ("tokenHash");


--
-- Name: password_reset_tokens_userId_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "password_reset_tokens_userId_expiresAt_idx" ON public.password_reset_tokens USING btree ("userId", "expiresAt");


--
-- Name: profiles_emiratesIdHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_emiratesIdHash_idx" ON public.profiles USING btree ("emiratesIdHash");


--
-- Name: profiles_linkId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "profiles_linkId_key" ON public.profiles USING btree ("linkId");


--
-- Name: profiles_molNoHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_molNoHash_idx" ON public.profiles USING btree ("molNoHash");


--
-- Name: profiles_passportNoHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_passportNoHash_idx" ON public.profiles USING btree ("passportNoHash");


--
-- Name: profiles_statusId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_statusId_idx" ON public.profiles USING btree ("statusId");


--
-- Name: profiles_visaNoHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_visaNoHash_idx" ON public.profiles USING btree ("visaNoHash");


--
-- Name: roles_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name);


--
-- Name: salary_templates_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX salary_templates_name_key ON public.salary_templates USING btree (name);


--
-- Name: sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_expiresAt_idx" ON public.sessions USING btree ("expiresAt");


--
-- Name: sessions_familyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_familyId_idx" ON public.sessions USING btree ("familyId");


--
-- Name: sessions_refreshTokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON public.sessions USING btree ("refreshTokenHash");


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: shifts_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX shifts_name_key ON public.shifts USING btree (name);


--
-- Name: sites_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sites_name_key ON public.sites USING btree (name);


--
-- Name: stored_files_fileTypeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stored_files_fileTypeId_idx" ON public.stored_files USING btree ("fileTypeId");


--
-- Name: stored_files_storageKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "stored_files_storageKey_key" ON public.stored_files USING btree ("storageKey");


--
-- Name: system_configurations_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX system_configurations_name_key ON public.system_configurations USING btree (name);


--
-- Name: user_activities_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "user_activities_userId_key" ON public.user_activities USING btree ("userId");


--
-- Name: user_types_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX user_types_name_key ON public.user_types USING btree (name);


--
-- Name: users_profileId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "users_profileId_key" ON public.users USING btree ("profileId");


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: weekly_off_assignments_profileId_year_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "weekly_off_assignments_profileId_year_key" ON public.weekly_off_assignments USING btree ("profileId", year);


--
-- Name: weekly_off_configs_siteId_year_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "weekly_off_configs_siteId_year_name_key" ON public.weekly_off_configs USING btree ("siteId", year, name);


--
-- Name: activity_logs activity_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: application_branding application_branding_faviconFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_branding
    ADD CONSTRAINT "application_branding_faviconFileId_fkey" FOREIGN KEY ("faviconFileId") REFERENCES public.stored_files(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: application_branding application_branding_logoFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_branding
    ADD CONSTRAINT "application_branding_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES public.stored_files(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_accounts bank_accounts_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT "bank_accounts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: custom_field_values custom_field_values_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT "custom_field_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public.custom_field_definitions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: custom_field_values custom_field_values_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT "custom_field_values_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dependants dependants_dependantProfileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependants
    ADD CONSTRAINT "dependants_dependantProfileId_fkey" FOREIGN KEY ("dependantProfileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: dependants dependants_employeeProfileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependants
    ADD CONSTRAINT "dependants_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_field_values document_field_values_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_field_values
    ADD CONSTRAINT "document_field_values_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_field_values document_field_values_fieldId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_field_values
    ADD CONSTRAINT "document_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES public.form_fields(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_files document_files_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_files
    ADD CONSTRAINT "document_files_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: document_files document_files_fileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_files
    ADD CONSTRAINT "document_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES public.stored_files(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documents documents_documentTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES public.document_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: documents documents_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "documents_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employee_profile_sections employee_profile_sections_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profile_sections
    ADD CONSTRAINT "employee_profile_sections_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: employees employees_reportingToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_reportingToId_fkey" FOREIGN KEY ("reportingToId") REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_shiftId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES public.shifts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: employees employees_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT "employees_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public.sites(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: expiry_alert_logs expiry_alert_logs_documentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expiry_alert_logs
    ADD CONSTRAINT "expiry_alert_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES public.documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: form_fields form_fields_documentTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT "form_fields_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES public.document_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: form_fields form_fields_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_fields
    ADD CONSTRAINT "form_fields_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public.form_entities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: holiday_calendar_entries holiday_calendar_entries_holidayListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_calendar_entries
    ADD CONSTRAINT "holiday_calendar_entries_holidayListId_fkey" FOREIGN KEY ("holidayListId") REFERENCES public.holiday_lists(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: holiday_calendar_entries holiday_calendar_entries_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_calendar_entries
    ADD CONSTRAINT "holiday_calendar_entries_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: holiday_lists holiday_lists_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.holiday_lists
    ADD CONSTRAINT "holiday_lists_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public.sites(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_items menu_items_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT "menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: menu_user_overrides menu_user_overrides_menuItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_overrides
    ADD CONSTRAINT "menu_user_overrides_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: menu_user_overrides menu_user_overrides_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_overrides
    ADD CONSTRAINT "menu_user_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: menu_user_type_permissions menu_user_type_permissions_menuItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_type_permissions
    ADD CONSTRAINT "menu_user_type_permissions_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES public.menu_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: menu_user_type_permissions menu_user_type_permissions_userTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_user_type_permissions
    ADD CONSTRAINT "menu_user_type_permissions_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES public.user_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: one_time_login_tokens one_time_login_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.one_time_login_tokens
    ADD CONSTRAINT "one_time_login_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: parameters parameters_parameterTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parameters
    ADD CONSTRAINT "parameters_parameterTypeId_fkey" FOREIGN KEY ("parameterTypeId") REFERENCES public.parameter_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: password_reset_tokens password_reset_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: profile_departments profile_departments_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_departments
    ADD CONSTRAINT "profile_departments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: profile_departments profile_departments_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile_departments
    ADD CONSTRAINT "profile_departments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: profiles profiles_photoFileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT "profiles_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES public.stored_files(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: stored_files stored_files_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT "stored_files_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: stored_files stored_files_fileTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stored_files
    ADD CONSTRAINT "stored_files_fileTypeId_fkey" FOREIGN KEY ("fileTypeId") REFERENCES public.document_types(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_activities user_activities_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_userTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES public.user_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: weekly_off_assignments weekly_off_assignments_profileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_assignments
    ADD CONSTRAINT "weekly_off_assignments_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: weekly_off_assignments weekly_off_assignments_weeklyOffConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_assignments
    ADD CONSTRAINT "weekly_off_assignments_weeklyOffConfigId_fkey" FOREIGN KEY ("weeklyOffConfigId") REFERENCES public.weekly_off_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: weekly_off_configs weekly_off_configs_siteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_off_configs
    ADD CONSTRAINT "weekly_off_configs_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES public.sites(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict nkYKnHITgJO08Z7xJz0FtdYtHYMFg4LbaiVwP9BwV6ao2lPQKMtWAUqDAbfSFf2

