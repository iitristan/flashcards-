"use client";

import React from "react";
import { X, User, Award, Building, MapPin, Hash } from "lucide-react";
import { CBLEExamineeProfile } from "@/data/cble-mock-data";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: CBLEExamineeProfile;
}

export function ProfileModal({ isOpen, onClose, profile }: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-[#2e3b44] px-5 py-3 text-white">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-base tracking-wide">Examinee Profile & Verification</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Top Banner with Avatar */}
          <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-4 border border-slate-200">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100">
              <User className="h-8 w-8" />
              <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-slate-900">{profile.name}</h4>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  Verified
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">{profile.role}</p>
              <p className="text-xs text-slate-400">ID: {profile.examineeNumber}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-md border border-slate-200 p-3 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <Hash className="h-3.5 w-3.5 text-slate-400" /> Application Number
              </div>
              <p className="mt-1 font-mono font-medium text-slate-800">{profile.applicationNumber}</p>
            </div>

            <div className="rounded-md border border-slate-200 p-3 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <Building className="h-3.5 w-3.5 text-slate-400" /> School / Alma Mater
              </div>
              <p className="mt-1 font-medium text-slate-800 line-clamp-2">{profile.school}</p>
            </div>

            <div className="rounded-md border border-slate-200 p-3 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Testing Center
              </div>
              <p className="mt-1 font-medium text-slate-800">{profile.testingCenter}</p>
            </div>

            <div className="rounded-md border border-slate-200 p-3 bg-white">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <Award className="h-3.5 w-3.5 text-slate-400" /> Room & Seat Assignment
              </div>
              <p className="mt-1 font-medium text-slate-800">{profile.roomNumber} | {profile.seatNumber}</p>
            </div>
          </div>

          {/* Examination Info */}
          <div className="rounded-md bg-sky-50 border border-sky-200 p-3.5 text-sm text-sky-900">
            <div className="font-semibold text-xs uppercase tracking-wider text-sky-700 mb-1">
              Active Examination Module
            </div>
            <p className="font-bold">{profile.examinationName}</p>
            <p className="text-xs text-sky-800 mt-0.5">Subject: {profile.subject}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            onClick={onClose}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-900 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
