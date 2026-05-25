"""
navigation.py
=============
Tool for handling frontend navigation requests.

NOTE: This file is legacy/dead code — controller.py handles all navigation
directly via BackendAPI + FrontendActions string constants.
Kept for reference / potential future planner integration.
Updated to use current NAVIGATE_* FrontendActions constants.
"""
from tools.base import BaseTool
from contract import FrontendActions

class NavigationTool(BaseTool):
    """
    Navigation Tool
    Algorithm: Rule-Based Intent-to-UI Mapping

    NOTE: Not called by AgentController. Controller returns FrontendActions
    strings directly. This class is preserved for planner-based future use.
    """

    name = "navigation_tool"

    def run(self, page: str = None, action: str = None, product_id: str = None, **kwargs):
        """
        Handles navigation requests.
        Accepts 'page' (from Planner) or 'action' (direct).
        Returns a dict with 'type' matching current FrontendActions constants.
        """

        # 1. Resolve Target (Planner sends 'page', User might send 'action')
        target = page or action or "HOME"
        target = target.upper()

        # 2. Resolve Payload
        payload = {}
        if product_id:
            payload["product_id"] = product_id

        # ----------------------------
        # INTENT → UI MAPPING  (updated to NAVIGATE_* constants)
        # ----------------------------
        if "HOME" in target:
            return {
                "type": FrontendActions.NAVIGATE_HOME,   # was: OPEN_HOME
                "payload": None
            }

        if "PRODUCT" in target:
            return {
                "type": FrontendActions.NAVIGATE_PRODUCT_DETAIL,  # was: OPEN_PRODUCT_PAGE
                "payload": payload
            }

        if "CART" in target:
            return {
                "type": FrontendActions.NAVIGATE_CART,   # was: OPEN_CART
                "payload": None
            }

        if "CHECKOUT" in target or "PAYMENT" in target:
            return {
                "type": FrontendActions.NAVIGATE_PAYMENT,  # was: OPEN_CHECKOUT
                "payload": None
            }

        if "ACCOUNT" in target or "DASHBOARD" in target:
            return {
                "type": FrontendActions.NAVIGATE_ACCOUNT,
                "payload": None
            }

        if "SOCIAL" in target or "FEED" in target:
            return {
                "type": FrontendActions.NAVIGATE_SOCIAL,
                "payload": None
            }

        # ----------------------------
        # FALLBACK — log unknown target, return HOME
        # ----------------------------
        print(f"[NavigationTool] Unknown navigation target: {target}, defaulting to HOME")
        return {
            "type": FrontendActions.NAVIGATE_HOME,
            "payload": {"message": f"Unknown navigation request: {target}"}
        }
